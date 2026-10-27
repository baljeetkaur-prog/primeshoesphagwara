const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken"); 
// const path = require('path');
const multer = require('multer');
// const fs = require('fs');
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const slugify = require('slugify');
const axios = require("axios");
const { Resend } = require("resend");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);


require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const app = express();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 9000;
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createRazorpayRefund = async ({
  paymentId,
  amountPaise,
  idempotencyKey,
  receipt,
}) => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are missing");
  }

  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        "Content-Type": "application/json",
        "X-Refund-Idempotency": idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountPaise,
        speed: "optimum",
        receipt,
      }),
      signal: AbortSignal.timeout(20000),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.error?.description || `Razorpay refund request failed (${response.status})`
    );
    error.status = response.status;
    error.razorpayError = data?.error;
    throw error;
  }

  return data;
};
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
if (!['admin', 'superadmin'].includes(decoded.role)) {
  return res.status(403).json({ error: 'Forbidden' });
}
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Token invalid or expired' });
  }
};
const resend = new Resend(process.env.RESEND_API_KEY);


async function sendOrderNotification(order) {
  try {
    const billing = order.billing || {};

    const customerName = [
      billing.firstName,
      billing.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const itemsText = await Promise.all(
      (order.items || []).map(async (item, index) => {
        const quantity = Number(item.quantity || 0);

        const unitPrice = Number(
          item.discountPrice ??
          item.price ??
          0
        );

        const itemTotal = Number(
          item.finalPaidAmount ??
          item.finalPrice ??
          unitPrice * quantity
        );

        let productLink = "Product link unavailable";

        try {
          const product = await Product.findById(
            item.productId
          );

          if (product?.slug) {
            productLink =
              `https://www.primeshoesphagwara.com/product/${product.slug}`;
          }
        } catch (error) {
          console.error(
            `Could not fetch product ${item.productId}:`,
            error.message
          );
        }

        return `
PRODUCT ${index + 1}
Name: ${item.title || "Product"}
Color: ${item.variant?.color || "N/A"}
Size: ${item.variant?.size || "N/A"}
Quantity: ${quantity}
Unit Price: ₹${unitPrice.toFixed(2)}
Item Total: ₹${itemTotal.toFixed(2)}
Product Link: ${productLink}
        `.trim();
      })
    );

    const subtotal = Number(order.finalTotal || 0);
    const delivery = Number(order.deliveryCharge || 0);
    const total = subtotal + delivery;

    const address = [
      billing.addressLine1 || billing.address || "",
      billing.addressLine2 || billing.apartment || "",
      billing.city || "",
      billing.state || "",
      billing.zip || "",
      billing.country || "",
    ]
      .filter(Boolean)
      .join(", ");

    const { data, error } = await resend.emails.send({
      from:
        process.env.ORDER_NOTIFICATION_FROM ||
        "Prime Shoes Orders <orders@primeshoesphagwara.com>",

      to: [process.env.OWNER_ORDER_EMAIL],

      subject: `New Paid Order - ${
        order.orderNumber || order._id
      }`,

      text: `
A new order has been paid for and confirmed on Prime Shoes.

ORDER DETAILS
Order Number: ${order.orderNumber || order._id}
Order Status: ${order.status || "Confirmed"}
Payment Status: ${order.paymentInfo?.status || "success"}

CUSTOMER DETAILS
Name: ${customerName || "N/A"}
Email: ${billing.email || order.email || "N/A"}
Phone: ${billing.phone || "N/A"}

DELIVERY ADDRESS
${address || "Not available"}

ORDER ITEMS
${itemsText.join("\n\n----------------------\n\n") ||
  "No item details available"}

Subtotal: ₹${subtotal.toFixed(2)}
Delivery Charge: ₹${delivery.toFixed(2)}
Total Paid: ₹${total.toFixed(2)}
      `,
    });

    if (error) {
      console.error("Owner order email failed:", error);
      return false;
    }

    console.log("Owner order email sent:", data?.id);
    return true;
  } catch (error) {
    console.error(
      "Owner order email error:",
      error.message
    );
    return false;
  }
}

async function sendCustomerOrderConfirmation(order) {
  try {
    const billing = order.billing || {};

    const customerEmail = billing.email || order.email;

    if (!customerEmail) {
      console.error("Customer email is missing.");
      return false;
    }

    const customerName =
      [
        billing.firstName,
        billing.lastName,
      ]
        .filter(Boolean)
        .join(" ") || "Customer";

    const escapeHtml = (value) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char]
      );

    const itemsHtml = await Promise.all(
      (order.items || []).map(async (item) => {
        let productLink = "";

        try {
          const product = await Product.findById(
            item.productId
          );

          if (product?.slug) {
            productLink =
              `https://www.primeshoesphagwara.com/product/${product.slug}`;
          }
        } catch (error) {
          console.error(
            "Could not fetch product:",
            error.message
          );
        }

        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(
          item.discountPrice ?? item.price ?? 0
        );
        const itemTotal = Number(
          item.finalPaidAmount ??
          item.finalPrice ??
          unitPrice * quantity
        );

        const productName = escapeHtml(
          item.title || "Prime Shoes Product"
        );

        const productNameHtml = productLink
          ? `<a href="${escapeHtml(productLink)}"
               style="color:#222;text-decoration:underline;">
               ${productName}
             </a>`
          : productName;

        return `
          <tr>
            <td style="padding:16px 10px;border-bottom:1px solid #eeeeee;">
              <strong>${productNameHtml}</strong>
              <div style="color:#666;font-size:13px;margin-top:7px;">
                Color: ${escapeHtml(item.variant?.color || "N/A")}
                &nbsp;|&nbsp;
                Size: ${escapeHtml(item.variant?.size || "N/A")}
              </div>
              <div style="color:#666;font-size:13px;margin-top:5px;">
                Quantity: ${quantity}
              </div>
            </td>
            <td style="padding:16px 10px;border-bottom:1px solid #eeeeee;text-align:right;white-space:nowrap;">
              ₹${itemTotal.toFixed(2)}
            </td>
          </tr>
        `;
      })
    );

    const address = [
      billing.addressLine1 || billing.address || "",
      billing.addressLine2 || billing.apartment || "",
      billing.city || "",
      billing.state || "",
      billing.zip || "",
      billing.country || "",
    ]
      .filter(Boolean)
      .join(", ");

    const subtotal = Number(order.finalTotal || 0);
    const delivery = Number(order.deliveryCharge || 0);
    const total = subtotal + delivery;

    const { data, error } = await resend.emails.send({
      from:
        process.env.ORDER_NOTIFICATION_FROM ||
        "Prime Shoes <orders@primeshoesphagwara.com>",

      to: [customerEmail],

      subject: `Order Confirmed! ${order.orderNumber || order._id} | Prime Shoes`,

      html: `
        <div style="background:#f5f5f5;padding:30px 12px;font-family:Arial,Helvetica,sans-serif;color:#222;">
          <div style="max-width:650px;margin:0 auto;background:#ffffff;border:1px solid #eeeeee;">

            <div style="background:#171717;padding:28px 20px;text-align:center;">
              <a href="https://www.primeshoesphagwara.com"
                 style="color:#ffffff;text-decoration:none;font-size:27px;font-weight:bold;letter-spacing:1px;">
                PRIME SHOES
              </a>
              <p style="color:#dddddd;font-size:12px;letter-spacing:2px;margin:10px 0 0;">
                STEP INTO STYLE
              </p>
            </div>

            <div style="padding:32px 24px;">
              <p style="font-size:13px;color:#777;margin:0 0 10px;">
                ORDER CONFIRMATION
              </p>

              <h1 style="font-size:25px;margin:0 0 16px;color:#171717;">
                Thank you for your order, ${escapeHtml(customerName)}!
              </h1>

              <p style="font-size:15px;line-height:1.7;color:#555;">
                We're happy you chose Prime Shoes. Your payment has been
                verified and your order is confirmed. Here are your order details.
              </p>

              <div style="background:#f7f8f5;padding:18px;margin:24px 0;">
                <p style="margin:0 0 8px;font-size:14px;">
                  <strong>Order Number:</strong>
                  ${escapeHtml(order.orderNumber || order._id)}
                </p>
                <p style="margin:0;font-size:14px;">
                  <strong>Payment Status:</strong>
                  <span style="color:#388221;">Paid successfully</span>
                </p>
              </div>

              <h2 style="font-size:18px;margin:28px 0 12px;">
                Your Order
              </h2>

              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                  <tr style="background:#f7f7f7;">
                    <th style="padding:12px 10px;text-align:left;">Product</th>
                    <th style="padding:12px 10px;text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml.join("")}
                </tbody>
              </table>

              <table style="width:100%;margin-top:18px;font-size:14px;">
                <tr>
                  <td style="padding:7px 0;color:#666;">Subtotal</td>
                  <td style="padding:7px 0;text-align:right;">
                    ₹${subtotal.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#666;">Delivery Charge</td>
                  <td style="padding:7px 0;text-align:right;">
                    ₹${delivery.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0;border-top:1px solid #ddd;font-size:17px;">
                    <strong>Total</strong>
                  </td>
                  <td style="padding:14px 0;border-top:1px solid #ddd;text-align:right;font-size:17px;">
                    <strong>₹${total.toFixed(2)}</strong>
                  </td>
                </tr>
              </table>

              <h2 style="font-size:18px;margin:30px 0 12px;">
                Delivery Address
              </h2>

              <p style="font-size:14px;line-height:1.8;color:#555;">
                <strong>${escapeHtml(customerName)}</strong><br>
                ${escapeHtml(address || "Address not available")}<br>
                Phone: ${escapeHtml(billing.phone || "N/A")}<br>
                Email: ${escapeHtml(customerEmail)}
              </p>

              <div style="text-align:center;margin:32px 0 20px;">
                <a href="https://www.primeshoesphagwara.com"
                   style="display:inline-block;background:#171717;color:#ffffff;text-decoration:none;padding:14px 25px;font-size:14px;font-weight:bold;">
                  VISIT PRIME SHOES
                </a>
              </div>

              <p style="font-size:14px;line-height:1.7;color:#666;">
                We appreciate your trust in Prime Shoes and hope you love your purchase.
                We'll share further updates when they become available.
              </p>

              <p style="font-size:14px;color:#333;line-height:1.7;">
                Warm regards,<br>
                <strong>Team Prime Shoes</strong>
              </p>
            </div>

            <div style="background:#f7f7f7;padding:20px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="font-size:12px;color:#777;margin:0 0 8px;">
                Prime Shoes
              </p>
              <a href="https://www.primeshoesphagwara.com"
                 style="font-size:12px;color:#555;">
                www.primeshoesphagwara.com
              </a>
            </div>

          </div>
        </div>
      `,
    });

    if (error) {
      console.error(
        "Customer confirmation email failed:",
        error
      );
      return false;
    }

    console.log(
      "Customer confirmation email sent:",
      data?.id
    );

    return true;
  } catch (error) {
    console.error(
      "Customer confirmation email error:",
      error.message
    );

    return false;
  }
}


async function sendOrderStatusEmails(order, item, eventType) {
  try {
    const ownerEmail = process.env.OWNER_ORDER_EMAIL;

    if (!ownerEmail || !ownerEmail.trim()) {
      console.error("OWNER_ORDER_EMAIL is not configured");
      return false;
    }

    const billing = order.billing || {};

    const customerName = [
      billing.firstName,
      billing.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "Customer";

    const eventDetails = {
      "return-requested": {
        subject: "Return Request Received",
        heading: "A customer has requested a return",
        message:
          "A customer has submitted a return request. Admin review is required.",
      },

      cancelled: {
        subject: "Order Cancellation",
        heading: "An order item has been cancelled",
        message:
          "An order item has been cancelled. Review the cancellation and refund details below.",
      },

      "return-refunded": {
        subject: "Return Refund Processed",
        heading: "A return refund has been processed",
        message:
          "A return refund has been confirmed as processed. Review the details below.",
      },
    };

    const details = eventDetails[eventType];

    if (!details) {
      console.error("Unknown order email event:", eventType);
      return false;
    }

    const orderNumber = order.orderNumber || order._id;
    const productName = item?.title || "Prime Shoes product";
    const color = item?.variant?.color || "N/A";
    const size = item?.variant?.size || "N/A";
    const quantity = Number(item?.quantity || 0);

    const amount = Number(
      item?.refundAmount ??
      item?.finalPaidAmount ??
      item?.finalPrice ??
      0
    );

    const reason =
      item?.returnReason ||
      item?.cancellationReason ||
      "Not provided";

    const refundStatus = item?.refundStatus || "Not applicable";

    const paymentMode = order.paymentMode || "N/A";

    const subject =
      `Prime Shoes | ${details.subject} | ${orderNumber}`;

    const text = `
PRIME SHOES
${details.heading}

${details.message}

ORDER DETAILS
Order Number: ${orderNumber}
Order Status: ${order.status || "N/A"}
Payment Method: ${paymentMode}
Payment Status: ${order.paymentInfo?.status || "N/A"}

CUSTOMER DETAILS
Name: ${customerName}
Email: ${billing.email || order.email || "N/A"}
Phone: ${billing.phone || "N/A"}

ITEM DETAILS
Product: ${productName}
Color: ${color}
Size: ${size}
Quantity: ${quantity}
Item Amount: ₹${amount.toFixed(2)}

REQUEST DETAILS
Event: ${eventType}
Reason: ${reason}
Request Date: ${
      item?.returnedAt || item?.cancelledAt || new Date()
    }
Refund Status: ${refundStatus}
Refund Amount: ${
      item?.refundAmount != null
        ? `₹${Number(item.refundAmount).toFixed(2)}`
        : "Not confirmed"
    }
Refund ID: ${item?.refundId || "N/A"}

Please review this request in the admin panel.

Website: https://www.primeshoesphagwara.com

Team Prime Shoes
    `.trim();

    const { data, error } = await resend.emails.send({
      from:
        process.env.ORDER_NOTIFICATION_FROM ||
        "Prime Shoes Orders <orders@primeshoesphagwara.com>",

      // Only the admin receives this email.
      to: [ownerEmail.trim()],

      subject,
      text,
    });

    if (error) {
      console.error("Admin order status email failed:", error);
      return false;
    }

    console.log(
      `Admin ${eventType} email sent:`,
      data?.id
    );

    return true;
  } catch (error) {
    console.error(
      "Admin order status email error:",
      error.message
    );

    return false;
  }
}






async function restoreReturnedItemStock(orderId, variantId) {
  const session = await mongoose.startSession();

  try {
    let outcome = "not-eligible";

    await session.withTransaction(async () => {
      const order = await Order.findOneAndUpdate(
        {
          _id: orderId,
          items: {
            $elemMatch: {
              variantId,
              stockRestored: false,
              refundStatus: "Refunded",
              status: "Returned",
              isReturned: true,
              returnInspected: true,
            },
          },
        },
        {
          $set: {
            "items.$.stockRestored": true,
          },
        },
        {
          new: true,
          session,
        }
      );

      if (!order) {
        const currentOrder = await Order.findById(orderId)
          .session(session);

        const currentItem = currentOrder?.items.find(
          (entry) =>
            entry.variantId?.toString() ===
            variantId.toString()
        );

        outcome = currentItem?.stockRestored
          ? "already-restored"
          : "not-eligible";

        return;
      }

      const item = order.items.find(
        (entry) =>
          entry.variantId?.toString() ===
          variantId.toString()
      );

      if (
        !item?.productId ||
        !item?.variantId ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new Error(
          "Cannot restore stock: item details are invalid"
        );
      }

      const result = await Product.updateOne(
        {
          _id: item.productId,
          "variants._id": item.variantId,
        },
        {
          $inc: {
            "variants.$.quantity": item.quantity,
          },
        },
        { session }
      );

      if (result.matchedCount !== 1) {
        throw new Error("Product variant not found");
      }

      outcome = "restored";
    });

    return {
      success:
        outcome === "restored" ||
        outcome === "already-restored",
      restored: outcome === "restored",
      outcome,
    };
  } finally {
    await session.endSession();
  }
}



app.post(
  "/api/admin/returns/:orderId/inspect",
  verifyAdmin,
  async (req, res) => {
    try {
      const { variantId, approvedForResale } = req.body || {};

      if (!variantId || approvedForResale !== true) {
        return res.status(400).json({
          message:
            "Confirm that the returned shoes were inspected and are suitable for resale",
        });
      }

      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      const item = order.items.find(
        (entry) =>
          entry.variantId?.toString() === variantId.toString()
      );

      if (!item) {
        return res.status(404).json({
          message: "Order item not found",
        });
      }


      // Only inspect an item with an outstanding return request.
      if (
        item.status !== "Return Requested" ||
        item.refundStatus !== "Pending" ||
        item.isReturned
      ) {
        return res.status(400).json({
          message:
            "Only an item with a pending return request can be inspected",
        });
      }

      // Do not inspect until the returned parcel has arrived.
      if (order.returnPickupStatus !== "Delivered") {
        return res.status(400).json({
          message:
            "The returned parcel must be marked as delivered before inspection.",
        });
      }

      // Prevent recording the same inspection twice.
      if (item.returnInspected === true) {
        return res.status(409).json({
          message: "This item has already been inspected.",
        });
      }


      if (item.stockRestored) {
        return res.status(409).json({
          message: "Stock has already been restored for this item",
        });
      }

      // Record inspection only. Do not refund or restore stock here.
      item.returnInspected = true;

      await order.save();

      return res.json({
        success: true,
        message:
          "Inspection recorded. The item is now ready for refund approval.",
      });
    } catch (error) {
      console.error("Return Inspection Error:", error);

      return res.status(500).json({
        message: "Could not record the return inspection",
      });
    }
  }
);






app.use('/img', express.static('public/img', {
  maxAge: '30d', // cache for 30 days
  etag: false
}));
async function revalidateCartCoupon(cart) {

  if (!cart?.coupon?.code) return;

  const coupon = await Coupon.findOne({
    code: cart.coupon.code,
    active: true
  });

  if (!coupon) {
    cart.coupon = null;
    return;
  }

  let subtotal = 0;

  for (const item of cart.items) {

    const product = await Product.findById(item.productId);

    if (!product) continue;

    const price =
      product.discountedPrice ||
      product.originalPrice ||
      0;

    subtotal += price * item.quantity;
  }

  const now = new Date();

  const invalidCoupon =
    (coupon.startDate && now < coupon.startDate) ||
    (coupon.expiryDate && now > coupon.expiryDate) ||
    (coupon.usedCount >= coupon.totalUsageLimit) ||
    (subtotal < coupon.minOrderAmount);

  if (invalidCoupon) {
    cart.coupon = null;
  }
}
function getProductWeight(category) {
  switch (category) {
    case "men":
      return 1.0;

    case "women":
      return 0.7;

    case "kids":
      return 0.5;

    case "handbags":
      return 0.8;

    case "accessories":
      return 0.2;

    default:
      return 0.8;
  }
}
async function getShiprocketToken() {
  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/auth/login",
    {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }
  );

  return response.data.token;
}

async function createShiprocketOrder(order) {
  const token = await getShiprocketToken();

  let totalWeight = 0;

  for (const item of order.items) {
    // Don't ship cancelled or returned items.
    if (
      item.isCancelled ||
      item.status === "Cancelled" ||
      item.status === "Returned"
    ) {
      continue;
    }

    const product = await Product.findById(item.productId);

    if (!product) {
      throw new Error(
        `Product not found for order item: ${item.title}`
      );
    }

    totalWeight +=
      getProductWeight(product.category) *
      Number(item.quantity || 0);
  }

  if (!Number.isFinite(totalWeight) || totalWeight <= 0) {
    throw new Error("Invalid shipment weight calculated");
  }

  console.log("Calculated Shiprocket Weight:", totalWeight);

  const activeItems = order.items.filter(
    (item) =>
      !item.isCancelled &&
      item.status !== "Cancelled" &&
      item.status !== "Returned"
  );

  if (activeItems.length === 0) {
    throw new Error("No active items available to ship");
  }

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
    {
      order_id: order.orderNumber,
      order_date: new Date().toISOString().split("T")[0],

      pickup_location: "work",

      billing_customer_name: order.billing.firstName,
      billing_last_name: order.billing.lastName || "",

      billing_address: [
        order.billing.addressLine1,
        order.billing.addressLine2,
      ]
        .filter(Boolean)
        .join(" "),

      billing_city: order.billing.city,
      billing_pincode: String(order.billing.zip),
      billing_state: order.billing.state,
      billing_country: order.billing.country,
      billing_email: order.billing.email,
      billing_phone: String(order.billing.phone),

      shipping_is_billing: true,

      order_items: activeItems.map((item) => ({
        name: item.title,
        sku: String(item.variantId || item.productId),
        units: Number(item.quantity),
        selling_price: Number(item.discountPrice),
      })),

      payment_method:
        order.paymentMode === "cod" ? "COD" : "Prepaid",

      sub_total: Number(order.finalTotal),

      length: 30,
      breadth: 20,
      height: 10,
      weight: Number(totalWeight.toFixed(2)),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}



async function shipOrderToShiprocket(orderId) {
  let order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  // Never ship cancelled orders.
  if (
    order.status === "Cancelled" ||
    order.shippingStatus === "Cancelled"
  ) {
    return {
      success: false,
      message: "Order is cancelled",
    };
  }

  // Online orders must be paid.
  if (order.paymentMode !== "cod" && !order.isPaid) {
    throw new Error("Online payment is not confirmed");
  }

  // Do not ship while a refund is being processed.
  if (order.refundProcessing === true) {
    return {
      success: false,
      message: "Refund is being processed",
    };
  }

  // Atomically prevent two requests from processing this order
  // at the same time.
  order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      shippingProcessing: { $ne: true },
      refundProcessing: { $ne: true },
      status: { $ne: "Cancelled" },
      shippingStatus: { $ne: "Cancelled" },
    },
    {
      $set: {
        shippingProcessing: true,
      },
    },
    { new: true }
  );

  if (!order) {
    console.log(
      "Shipping skipped: another process is handling this order."
    );

    return {
      success: false,
      message: "Shipping is already being processed",
    };
  }

  try {
    // Stop if previous creation needs manual investigation.
    if (order.shippingCreationStatus === "Manual Review") {
      throw new Error(
        "Shiprocket creation requires manual review before retrying"
      );
    }

    // Partial IDs can indicate that a previous operation failed
    // after Shiprocket created something.
    const hasOrderId = Boolean(order.shiprocketOrderId);
    const hasShipmentId = Boolean(order.shiprocketShipmentId);

    if (
      hasOrderId !== hasShipmentId ||
      (order.awbCode && !hasShipmentId)
    ) {
      order.shippingCreationStatus = "Manual Review";
      await order.save();

      throw new Error(
        "Incomplete Shiprocket identifiers. Check Shiprocket before retrying."
      );
    }

    // STEP 1: Create a Shiprocket order only if one does not exist.
    if (!hasOrderId && !hasShipmentId) {
      order.shippingCreationStatus = "Creating";
      await order.save();

      let createRes;

      try {
        createRes = await createShiprocketOrder(order);
      } catch (createError) {
        // Shiprocket may have created the order even if the
        // server did not receive its response.
        order.shippingCreationStatus = "Manual Review";
        await order.save();
        throw createError;
      }

      if (!createRes?.order_id || !createRes?.shipment_id) {
        order.shippingCreationStatus = "Manual Review";
        await order.save();

        throw new Error(
          "Shiprocket did not return both order and shipment IDs"
        );
      }

      order.shiprocketOrderId = String(createRes.order_id);
      order.shiprocketShipmentId = String(createRes.shipment_id);
      order.shippingCreationStatus = "Created";
      order.shippingStatus = "Processing";

      // Save IDs immediately so later steps can resume.
      await order.save();
    }

    const shipmentId = order.shiprocketShipmentId;

    // STEP 2: Assign AWB if not already assigned.
    if (!order.awbCode) {
      const awbRes = await assignAWB(shipmentId);

      console.log("AWB RESPONSE:", awbRes);

      const awbData = awbRes?.response?.data;

      if (
        awbRes?.awb_assign_status !== 1 ||
        !awbData?.awb_code
      ) {
        throw new Error(
          "Shiprocket did not confirm AWB assignment"
        );
      }

      order.awbCode = String(awbData.awb_code);
      order.courierName = awbData.courier_name || null;

      await order.save();
    }

    // STEP 3: Schedule pickup only if not already scheduled.
    if (order.awbCode && !order.pickupScheduled) {
      const pickupRes =
        await scheduleShiprocketPickup(shipmentId);

      console.log("SHIPROCKET PICKUP RESPONSE:", pickupRes);

      if (pickupRes?.pickup_status !== 1) {
        throw new Error(
          "Shiprocket did not confirm pickup scheduling"
        );
      }

      order.pickupScheduled = true;

      order.pickupScheduledAt =
        pickupRes.response?.pickup_scheduled_date
          ? new Date(
              pickupRes.response.pickup_scheduled_date
            )
          : new Date();

      order.pickupTokenNumber =
        pickupRes.response?.pickup_token_number || null;

      await order.save();
    }

    // STEP 4: Generate manifest if not already generated.
    if (order.pickupScheduled && !order.manifestGenerated) {
      const manifestRes =
        await generateShiprocketManifest(shipmentId);

      console.log(
        "SHIPROCKET MANIFEST RESPONSE:",
        manifestRes
      );

      if (
        manifestRes?.status !== 1 ||
        !manifestRes?.manifest_url
      ) {
        throw new Error(
          "Shiprocket did not return a manifest URL"
        );
      }

      order.manifestUrl = manifestRes.manifest_url;
      order.manifestGenerated = true;

      await order.save();
    }

    // STEP 5: Generate label if not already generated.
    if (order.awbCode && !order.labelGenerated) {
      const labelRes =
        await generateShiprocketLabel(shipmentId);

      console.log(
        "SHIPROCKET LABEL RESPONSE:",
        labelRes
      );

      if (
        labelRes?.label_created !== 1 ||
        !labelRes?.label_url
      ) {
        throw new Error(
          "Shiprocket did not return a shipping label URL"
        );
      }

      order.labelUrl = labelRes.label_url;
      order.labelGenerated = true;

      await order.save();
    }

    // STEP 6: Retrieve tracking URL.
    if (order.awbCode) {
      const track = await trackShipment(order.awbCode);

      order.trackingUrl =
        track?.tracking_data?.track_url || null;

      await order.save();
    }

    // Processing means the booking workflow ran.
    // It does not mean the courier has collected the parcel.
    order.shippingStatus = "Processing";
    order.shippingProcessing = false;

    await order.save();

    return {
      success: true,
      message: "Shiprocket booking workflow completed",
      awbCode: order.awbCode,
      trackingUrl: order.trackingUrl,
    };
  } catch (err) {
    console.error("Shiprocket operation failed:", {
      orderId: String(order._id),
      shiprocketOrderId: order.shiprocketOrderId,
      shipmentId: order.shiprocketShipmentId,
      awbCode: order.awbCode,
      error: err.response?.data || err.message,
    });

    // If creation began but no IDs were saved, the result is
    // uncertain. Do not automatically create another order.
    if (
      order.shippingCreationStatus === "Creating" &&
      !order.shiprocketOrderId &&
      !order.shiprocketShipmentId
    ) {
      order.shippingCreationStatus = "Manual Review";
    }

    order.shippingStatus = "Failed";
    order.shippingProcessing = false;

    await order.save();

    throw err;
  }
}


async function assignAWB(shipment_id) {
  const token = await getShiprocketToken();

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
    {
      shipment_id,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

async function scheduleShiprocketPickup(shipment_id) {
  if (!shipment_id) {
    throw new Error("Shiprocket shipment ID is required.");
  }

  const token = await getShiprocketToken();

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
    {
      shipment_id: [shipment_id],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}
async function cancelShiprocketShipment(awbCode) {
  if (!awbCode) {
    throw new Error("AWB is required to cancel the shipment");
  }

  const token = await getShiprocketToken();

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/orders/cancel/shipment/awbs",
    {
      awbs: [String(awbCode)],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}

async function requestShiprocketCancellationIfEligible(orderId) {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found for shipment cancellation");
  }

  // A shared shipment must not be cancelled while any item remains active.
  const allItemsCancelled =
    order.items.length > 0 &&
    order.items.every(
      (item) =>
        item.isCancelled || item.status === "Cancelled"
    );

  if (!allItemsCancelled) {
    return { requested: false, reason: "Other items remain active" };
  }

  // No AWB means there is no assigned courier shipment to cancel.
  if (!order.awbCode) {
    await Order.updateOne(
      {
        _id: order._id,
        shipmentCancellationStatus: "Not Requested",
      },
      {
        $set: {
          shipmentCancellationStatus: "Not Required",
        },
      }
    );

    return { requested: false, reason: "No AWB assigned" };
  }

  // Don't send a cancellation request for a shipment already
  // marked shipped, delivered, returned, or cancelled locally.
  if (
    ["Shipped", "Delivered", "Returned", "Cancelled"].includes(
      order.shippingStatus
    )
  ) {
    await Order.updateOne(
      {
        _id: order._id,
        shipmentCancellationStatus: "Not Requested",
      },
      {
        $set: {
          shipmentCancellationStatus: "Too Late",
        },
      }
    );

    return {
      requested: false,
      reason: "Shipment is already marked as dispatched or completed",
    };
  }

  // Claim the request atomically so concurrent calls don't submit
  // duplicate cancellation requests.
  const lock = await Order.updateOne(
    {
      _id: order._id,
      shipmentCancellationStatus: "Not Requested",
    },
    {
      $set: {
        shipmentCancellationStatus: "Pending",
        shipmentCancellationRequestedAt: new Date(),
        shipmentCancellationError: null,
      },
    }
  );

  if (lock.modifiedCount !== 1) {
    return {
      requested: false,
      reason: "Cancellation was already requested or reviewed",
    };
  }

  try {
    await cancelShiprocketShipment(order.awbCode);

    // Keep status Pending. The API response alone does not confirm
    // that the courier cancellation has completed.
    return {
      requested: true,
      status: "Pending",
    };
  } catch (error) {
    console.error(
      "Shiprocket shipment cancellation request failed:",
      error.response?.data || error.message
    );

    await Order.updateOne(
      {
        _id: order._id,
        shipmentCancellationStatus: "Pending",
      },
      {
        $set: {
          shipmentCancellationStatus: "Failed",
          shipmentCancellationError: String(
            error.response?.data?.message || error.message
          ).slice(0, 500),
        },
      }
    );

    return {
      requested: false,
      status: "Failed",
    };
  }
}

function buildShiprocketReturnPayload(order, item) {
  const billing = order.billing;

  if (!billing?.addressLine1 || !billing?.city ||
      !billing?.state || !billing?.zip ||
      !billing?.phone || !billing?.email) {
    throw new Error(
      "Customer pickup address is incomplete for the return shipment"
    );
  }

  if (!item?.title || !item?.quantity || !item?.finalPaidAmount) {
    throw new Error(
      "Returned item details are incomplete"
    );
  }

  return {
    order_id: `RET-${order.orderNumber}-${String(item.variantId)}`.slice(0, 50),
    order_date: new Date().toISOString().slice(0, 10),

    pickup_customer_name: billing.firstName,
    pickup_last_name: billing.lastName || "",
    pickup_address: billing.addressLine1,
    pickup_address_2: billing.addressLine2 || "",
    pickup_city: billing.city,
    pickup_state: billing.state,
    pickup_country: billing.country || "India",
    pickup_pincode: Number(billing.zip),
    pickup_email: billing.email,
    pickup_phone: String(billing.phone),
    pickup_isd_code: "91",

    // Seller's return destination

    // Seller's return destination
    shipping_customer_name: "Amandeep Singh",
    shipping_last_name: "Singh",
    shipping_address: "6QCC+PRR, Gaushala Bazar In Rd",
    shipping_address_2: "",
    shipping_city: "Phagwara",
    shipping_state: "Punjab",
    shipping_country: "India",
    shipping_pincode: 144401,
    shipping_email: "cool.aman41@yahoo.com",
    shipping_phone: "9988206681",
    shipping_isd_code: "91",


    order_items: [
      {
        name: String(item.title),
        sku: String(item.variantId),
        units: Number(item.quantity),
        selling_price: Number(item.finalPaidAmount),
        discount: 0
      }
    ],

    payment_method: "Prepaid",
    total_discount: 0,
    sub_total: Number(item.finalPaidAmount),

    // Confirm the actual packed return parcel dimensions and weight
    // before booking. Do not assume these values are accurate.
    length: Number(process.env.RETURN_PACKAGE_LENGTH_CM),
    breadth: Number(process.env.RETURN_PACKAGE_BREADTH_CM),
    height: Number(process.env.RETURN_PACKAGE_HEIGHT_CM),
    weight: Number(process.env.RETURN_PACKAGE_WEIGHT_KG),

    request_pickup: true
  };
}



async function generateShiprocketManifest(shipment_id) {
  if (!shipment_id) {
    throw new Error("Shiprocket shipment ID is required.");
  }

  const token = await getShiprocketToken();

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/manifests/generate",
    {
      shipment_id: [shipment_id],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (
    response.data?.status !== 1 ||
    !response.data?.manifest_url
  ) {
    throw new Error(
      "Shiprocket did not return a manifest URL."
    );
  }

  return response.data;
}

async function generateShiprocketLabel(shipment_id) {
  if (!shipment_id) {
    throw new Error("Shiprocket shipment ID is required.");
  }

  const token = await getShiprocketToken();

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/courier/generate/label",
    {
      shipment_id: [shipment_id],
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (
    response.data?.label_created !== 1 ||
    !response.data?.label_url
  ) {
    throw new Error(
      "Shiprocket did not return a shipping label URL."
    );
  }

  return response.data;
}



async function trackShipment(awb) {
  const token = await getShiprocketToken();

  const response = await axios.get(
    `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
}

async function createShiprocketReturnShipment(order, item) {
  if (!order || !item) {
    throw new Error("Order and return item are required");
  }

  if (!order.billing) {
    throw new Error("Customer address is missing");
  }

  const token = await getShiprocketToken();
  const buyer = order.billing;

  const returnOrderId =
    `RET-${order.orderNumber}-${String(item.variantId || item.productId)}`
      .replace(/[^a-zA-Z0-9-]/g, "")
      .slice(0, 50);

  const weight = Number(process.env.RETURN_PACKAGE_WEIGHT_KG);
  const length = Number(process.env.RETURN_PACKAGE_LENGTH_CM);
  const breadth = Number(process.env.RETURN_PACKAGE_BREADTH_CM);
  const height = Number(process.env.RETURN_PACKAGE_HEIGHT_CM);

  if (
    !Number.isFinite(weight) || weight <= 0 ||
    !Number.isFinite(length) || length <= 0 ||
    !Number.isFinite(breadth) || breadth <= 0 ||
    !Number.isFinite(height) || height <= 0
  ) {
    throw new Error(
      "Configure valid return package weight and dimensions first"
    );
  }

  const payload = {
    order_id: returnOrderId,
    order_date: new Date().toISOString().slice(0, 10),

    // Customer: reverse pickup address
    pickup_customer_name: buyer.firstName,
    pickup_last_name: buyer.lastName || "",
    pickup_address: buyer.addressLine1,
    pickup_address_2: buyer.addressLine2 || "",
    pickup_city: buyer.city,
    pickup_state: buyer.state,
    pickup_country: buyer.country,
    pickup_pincode: buyer.zip,
    pickup_email: buyer.email || order.email,
    pickup_phone: buyer.phone,
    pickup_isd_code: "91",

    // Prime Shoes: return destination
    shipping_customer_name: "Amandeep",
    shipping_last_name: "Singh",
    shipping_address:
      "6QCC+PRR, Gaushala Bazar In Rd",
    shipping_address_2: "",
    shipping_city: "Phagwara",
    shipping_state: "Punjab",
    shipping_country: "India",
    shipping_pincode: 144401,
    shipping_email: process.env.SHIPROCKET_RETURN_EMAIL,
    shipping_phone: "9988206681",
    shipping_isd_code: "91",

    order_items: [
      {
        name: item.title,
        sku: String(item.variantId || item.productId),
        units: item.quantity,
        selling_price: item.discountPrice,
      },
    ],

    payment_method: "Prepaid",
    sub_total: Number(
      item.finalPaidAmount ||
      item.discountPrice * item.quantity
    ),
    total_discount: 0,
    length,
    breadth,
    height,
    weight,
    request_pickup: true,
  };

  const response = await axios.post(
    "https://apiv2.shiprocket.in/v1/external/shipments/create/return-shipment",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data;
}




// const baseUploadPath = path.join(__dirname, 'public/uploads');
// if (!fs.existsSync(baseUploadPath)) {
//   fs.mkdirSync(baseUploadPath, { recursive: true });
// }
// const reviewsDir = path.join(baseUploadPath, 'reviews');
// if (!fs.existsSync(reviewsDir)) {
//   fs.mkdirSync(reviewsDir, { recursive: true });
// }

// Multer storage logic for reviews
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, reviewsDir);
//   },
//   filename: function (req, file, cb) {
//     const ext = path.extname(file.originalname);
//     const uniqueName = Date.now() + '-' + file.fieldname + ext;
//     cb(null, uniqueName);
//   }
// });
const isSuperAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized: No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden: Not a superadmin' });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    console.error('[isSuperAdmin Error]:', err);
    res.status(401).json({ message: 'Invalid Token' });
  }
};



// const upload = multer({ storage });
// const productStorage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, baseUploadPath); // <-- uploads to /public/uploads
//   },
//   filename: function (req, file, cb) {
//     const ext = path.extname(file.originalname);
//     const uniqueName = Date.now() + '-' + file.fieldname + ext;
//     cb(null, uniqueName);
//   }
// });

// const productUpload = multer({ storage: productStorage });

// Serve static files (so browser can access image URLs)
// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
const reviewStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "prime-shoes/reviews",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});
const upload = multer({ storage: reviewStorage });

// Product image upload storage
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "prime-shoes/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});
const productUpload = multer({ storage: productStorage });
const checkReviewExists = async (req, res, next) => {
  const { email } = req.body;
  const { productId } = req.params;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const alreadyReviewed = product.reviews.find(
      r => r.user.toString() === user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ error: 'You have already reviewed this product.' });
    }

    // Attach product and user to req to avoid refetching
    req.userDoc = user;
    req.productDoc = product;
    next();
  } catch (err) {
    console.error('Error in review check middleware:', err);
    res.status(500).json({ error: 'Internal error while checking review status.' });
  }
};

async function addSlugsToOldProducts() {
  try {
    const productsWithoutSlug = await Product.find({ $or: [{ slug: { $exists: false } }, { slug: '' }] });

    console.log(`Found ${productsWithoutSlug.length} products without slug.`);

    for (let product of productsWithoutSlug) {
      // Generate slug from title
      let baseSlug = slugify(product.title, { lower: true, strict: true });

      // Ensure uniqueness
      let slug = baseSlug;
      let counter = 1;
      while (await Product.exists({ slug })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      product.slug = slug;
      await product.save();
      console.log(`Updated product "${product.title}" with slug: ${slug}`);
    }

    console.log('All missing slugs have been added.');
  } catch (err) {
    console.error('Error adding slugs:', err);
  }
}

async function verifyCaptcha(captcha) {
  if (!captcha || !process.env.RECAPTCHA_SECRET_KEY) {
    return false;
  }

  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: captcha,
      })
    );

    return response.data.success === true;
  } catch (error) {
    console.error("CAPTCHA verification error:", error.message);
    return false;
  }
}

async function sendAuthEmail({ to, subject, text }) {
  const { data, error } = await resend.emails.send({
    from:
      process.env.ORDER_NOTIFICATION_FROM ||
      "Prime Shoes Orders <orders@primeshoesphagwara.com>",
    to: [to],
    subject,
    text,
  });

  if (error) {
    console.error("Authentication email failed:", error);
    throw new Error("Email delivery failed");
  }

  console.log("Authentication email sent:", data?.id);
}

function hashAuthToken(value) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}






// Connect to MongoDB
(async () => {
  try {
   await mongoose.connect(
  'mongodb+srv://primeshoesphagwara1_db_user:eJVO9tiBcf1HojBK@cluster0.kn7xncw.mongodb.net/primeshoes?retryWrites=true&w=majority&appName=Cluster0'
);
    console.log('MongoDB Connected');

    // Add slugs to old products
    await addSlugsToOldProducts();

    // Start your server after DB connection
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (e) {
  console.error("MongoDB Error:");
  console.error(e);
}
})();
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  usedCoupons: [
{
  couponCode: String,
  count: Number
}
], 

  // ✅ NEW: Saved Addresses
  addresses: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Auto-generated ID
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      country: { type: String, default: "IN" },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zip: { type: String, required: true },
      phone: { type: String, required: true },
      isDefault: { type: Boolean, default: false }
    }
  ], 
  emailVerified: {
  type: Boolean,
  default: true,
},

passwordResetTokenHash: {
  type: String,
  default: undefined,
},

passwordResetExpires: {
  type: Date,
  default: undefined,
},
}, { timestamps: true });
userSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const User = mongoose.model("User", userSchema, "User");

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpires: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

pendingRegistrationSchema.index(
  { otpExpires: 1 },
  { expireAfterSeconds: 0 }
);

const PendingRegistration =
  mongoose.models.PendingRegistration ||
  mongoose.model(
    "PendingRegistration",
    pendingRegistrationSchema
  );

app.get('/api/migrate-addresses', async (req, res) => {
  try {
    const result = await User.updateMany(
      { addresses: { $exists: false } }, 
      { $set: { addresses: [] } }
    );

    console.log("Migration completed:", result);
    res.json({ 
      message: "Migration completed successfully!", 
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error("Migration error:", error);
    res.status(500).json({ message: "Migration failed", error: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { captcha, payload } = req.body || {};

    if (!(await verifyCaptcha(captcha))) {
      return res.status(400).json({
        message: "Captcha verification failed.",
      });
    }

    if (!payload) {
      return res.status(400).json({
        message: "Registration details are required.",
      });
    }

    let decoded;

    try {
      decoded = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8")
      );
    } catch {
      return res.status(400).json({
        message: "Invalid registration details.",
      });
    }

    const name = String(decoded.name || "").trim();
    const email = String(decoded.email || "").trim().toLowerCase();
    const phone = String(decoded.phone || "").trim();
    const password = String(decoded.password || "");

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "All registration fields are required.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must contain at least 8 characters.",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered. Please log in.",
      });
    }

    // Limit repeated OTP sends for this pending email.
    const existingPending = await PendingRegistration.findOne({
      email,
    });

    if (
      existingPending &&
      Date.now() - existingPending.updatedAt.getTime() < 60 * 1000
    ) {
      return res.status(429).json({
        message: "Please wait 60 seconds before requesting another code.",
      });
    }

    const otp = generateOTP();
    const otpHash = hashAuthToken(otp);
    const hashedPassword = await bcrypt.hash(password, 12);

    await PendingRegistration.findOneAndUpdate(
      { email },
      {
        $set: {
          name,
          email,
          phone,
          password: hashedPassword,
          otpHash,
          otpExpires: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    try {
      await sendAuthEmail({
        to: email,
        subject: "Prime Shoes | Verify Your Email",
        text: `
Hello ${name},

Your Prime Shoes verification code is: ${otp}

This code expires in 10 minutes.

If you did not request this registration, you can ignore this email.

Team Prime Shoes
        `.trim(),
      });
    } catch (emailError) {
      await PendingRegistration.deleteOne({ email });

      return res.status(502).json({
        message: "Unable to send the verification code. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      requiresVerification: true,
      email,
      message: "Verification code sent to your email address.",
    });
  } catch (error) {
    console.error("Registration Error:", error);

    return res.status(500).json({
      message: "Registration failed. Please try again.",
    });
  }
});

app.post("/api/auth/verify-registration", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const otp = String(req.body.otp || "").trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Enter a valid 6-digit verification code.",
      });
    }

    const pending = await PendingRegistration.findOne({ email });

    if (!pending) {
      return res.status(400).json({
        message: "Registration expired or not found. Please register again.",
      });
    }

    if (pending.otpExpires.getTime() <= Date.now()) {
      await PendingRegistration.deleteOne({ _id: pending._id });

      return res.status(400).json({
        message: "Verification code expired. Please register again.",
      });
    }

    if (pending.attempts >= 5) {
      await PendingRegistration.deleteOne({ _id: pending._id });

      return res.status(429).json({
        message: "Too many incorrect attempts. Please register again.",
      });
    }

    const submittedHash = hashAuthToken(otp);

    if (submittedHash !== pending.otpHash) {
      await PendingRegistration.updateOne(
        {
          _id: pending._id,
          attempts: pending.attempts,
        },
        { $inc: { attempts: 1 } }
      );

      return res.status(400).json({
        message: "Incorrect verification code.",
      });
    }

    // Recheck the unique email before creating the account.
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      await PendingRegistration.deleteOne({ _id: pending._id });

      return res.status(409).json({
        message: "An account with this email already exists. Please log in.",
      });
    }

    try {
      await User.create({
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        password: pending.password,
        emailVerified: true,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "An account with this email already exists. Please log in.",
        });
      }

      throw error;
    }

    await PendingRegistration.deleteOne({ _id: pending._id });

    return res.status(201).json({
      success: true,
      message: "Email verified and account created successfully. Please log in.",
    });
  } catch (error) {
    console.error("Registration Verification Error:", error);

    return res.status(500).json({
      message: "Verification failed. Please try again.",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {

    // ✅ 1. CAPTCHA VALIDATION FIRST
    const { captcha } = req.body;

    if (!captcha) {
      return res.status(400).json({ message: "Captcha is required." });
    }

    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captcha}`;

    const captchaRes = await axios.post(verifyURL);

    if (!captchaRes.data.success) {
      return res.status(400).json({ message: "Captcha verification failed." });
    }

    // ✅ 2. YOUR EXISTING LOGIN LOGIC
    const decoded = JSON.parse(
      Buffer.from(req.body.payload, "base64").toString("utf8")
    );

    const { email, password } = decoded;

    // Check user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password." });
    if (user.emailVerified === false) {
  return res.status(403).json({
    message: "Please verify your email before logging in.",
  });
}

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password." });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const encodedToken = Buffer.from(token).toString("base64");

    res.status(200).json({
      message: "Login successful.",
      token: encodedToken,
      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});
app.post('/api/auth/changepassword', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Basic validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Find the user by email from the decoded token
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Compare current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    // Hash and update the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Change Password Error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});


app.post("/api/auth/forgot-password", async (req, res) => {
  const genericResponse = {
    success: true,
    message:
      "If an account exists for that email, a password reset link will be sent.",
  };

  try {
    const normalizedEmail = String(req.body?.email || "")
      .trim()
      .toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+passwordResetTokenHash +passwordResetExpires");

    // Do not reveal whether the account exists.
    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");

    user.passwordResetTokenHash = hashAuthToken(rawToken);
    user.passwordResetExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const frontendURL = process.env.FRONTEND_URL;

    if (!frontendURL) {
      throw new Error("FRONTEND_URL is not configured");
    }

    // Match the reset form in Login.jsx.
    const resetLink =
      `${frontendURL.replace(/\/+$/, "")}/login?resetToken=${rawToken}`;

    try {
      await sendAuthEmail({
        to: user.email,
        subject: "Prime Shoes | Reset Your Password",
        text: `
Hello ${user.name},

We received a request to reset your Prime Shoes password.

Open this link to set a new password:

${resetLink}

This link expires in 15 minutes and can only be used once.

If you did not request a password reset, ignore this email.

Team Prime Shoes
        `.trim(),
      });
    } catch (emailError) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      throw emailError;
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Forgot Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process your request. Please try again later.",
    });
  }
});



app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.newPassword || "");

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const tokenHash = hashAuthToken(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset link. Please request a new one.",
      });
    }

    user.password = await bcrypt.hash(password, 12);

    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset your password. Please try again.",
    });
  }
});


app.get("/api/auth/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.status(200).json({
      user
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});
const variantSchema = new mongoose.Schema({
  color: {
    type: String,
    required: true,
    trim: true,
  },

  size: {
    type: String,
    required: true,
    trim: true,
  },

  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },

  sku: {
    type: String,
    default: "",
  }
}, { _id: true });


const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  brand: {
    type: String,
    trim: true,
    default: "Prime Shoes",
  },
  category: {
    type: String,
    enum: ['men', 'women', 'kids', 'handbags', 'accessories'],
    required: true,
  },
  mainImage: {
    url: { type: String, required: true },
    publicId: { type: String, required: true }
  },
  otherImages: [
    {
      url: { type: String, required: true },
      publicId: { type: String, required: true }
    }
  ],
  description: {
    type: String,
    required: true,
  },
  originalPrice: {
    type: Number,
    required: true,
  },
  discountedPrice: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  numReviews: {
    type: Number,
    default: 0,
  },
  reviews: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
        default: 5
      },
      comment: {
        type: String,
        required: true
      },
image: {
  publicId: { type: String, required: false },
  url: { type: String, required: false }
},
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  variants: [variantSchema],
  label: {
    type: String,
    enum: ['New', 'Sale', 'Out Of Stock', ''],
    default: '',
  },
  specifications: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
    views: {
    type: Number,
    default: 0
  }, 
  slug: { type: String, unique: true, trim: true }, 
});



function arrayLimit(val) {
  return val.length <= 4;
}

productSchema.pre('validate', function(next) {
  if (this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});




const Product = mongoose.model('Product', productSchema, "Product");

app.post(
  "/api/products",
  productUpload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "otherImages", maxCount: 4 },
  ]),
  async (req, res) => {
    const session = await Product.startSession(); // optional if you want transactions
    session.startTransaction();

    try {
const {
  title,
  brand,
  category,
  description,
  originalPrice,
  discountedPrice,
  rating,
  numReviews,
  variants,
  label,
  specifications
} = req.body;

      const mainImage = req.files["mainImage"]?.[0];
      const otherImages = req.files["otherImages"] || [];

      if (!mainImage) {
        return res.status(400).json({ message: "Main image is required" });
      }

      const product = new Product({
        title,
        brand,
        category,
        description,
        specifications,
        originalPrice,
        discountedPrice,
        rating: rating || 0,
        numReviews: numReviews || 0,
      variants: JSON.parse(variants || "[]"),
        label,
        mainImage: {
          url: mainImage.path,
          publicId: mainImage.filename,
        },
        otherImages: otherImages.map((file) => ({
          url: file.path,
          publicId: file.filename,
        })),
      });

      await product.save({ session });
      await session.commitTransaction();

      res.status(201).json({ message: "Product created", product });

    } catch (err) {
      console.error("Product Upload Error:", err);

      // ❌ Delete images from Cloudinary if DB save fails
      if (req.files["mainImage"]) {
        await cloudinary.uploader.destroy(req.files["mainImage"][0].filename);
      }
      if (req.files["otherImages"]) {
        for (let file of req.files["otherImages"]) {
          await cloudinary.uploader.destroy(file.filename);
        }
      }

      await session.abortTransaction();
      res.status(500).json({ message: "Server error, images removed from Cloudinary" });
    } finally {
      session.endSession();
    }
  }
);

app.get('/api/products', async (req, res) => {
  try {
    const { category, sizes, colors, minPrice, maxPrice, label, page = 1, limit = 9 } = req.query;

    const filter = {};

    if (category) {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

 if (sizes) {
  const sizesArray = sizes.split(',').map(size => size.trim());

  filter["variants.size"] = {
    $in: sizesArray
  };
}

if (colors) {
  const colorsArray = colors
    .split(',')
    .map(color => color.trim());

  filter["variants.color"] = {
    $in: colorsArray.map(
      c => new RegExp(`^${c}$`, 'i')
    )
  };
}

    if (minPrice || maxPrice) {
      filter.discountedPrice = {};
      if (minPrice) filter.discountedPrice.$gte = parseInt(minPrice);
      if (maxPrice) filter.discountedPrice.$lte = parseInt(maxPrice);
    }

    // **Add this block for label filter**
    if (label) {
      filter.label = { $regex: new RegExp(`^${label.trim()}$`, 'i') };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      products,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/latest', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== '*') {
      filter.category = req.query.category.toLowerCase();
    }

    const latestProducts = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(250);

    res.json(latestProducts);
  } catch (err) {
    console.error('Error fetching latest products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});





app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } }, // increment view count
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Fetch product by slug
app.get('/api/products/slug/:slug', async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    
    // Increment views
    product.views = (product.views || 0) + 1;
    await product.save();

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/trendproducts', async (req, res) => {
  try {
    const allProducts = await Product.find();

    // 1. New Arrivals: latest by createdAt
    const newArrivals = allProducts
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      // no slice → all products

const trendingNow = allProducts
  .filter(product =>
    product.variants?.some(
      variant => variant.quantity > 0
    )
  )
  .sort((a, b) => {

    const totalA = a.variants.reduce(
      (sum, variant) => sum + variant.quantity,
      0
    );

    const totalB = b.variants.reduce(
      (sum, variant) => sum + variant.quantity,
      0
    );

    return totalB - totalA;
  });

    // 3. Just Launched: products explicitly marked as "new"
    const justLaunched = allProducts
      .filter(p => p.label?.toLowerCase() === "new");
      // no slice → all products

    // Send response
    res.json({
      newArrivals,
      trendingNow,
      justLaunched,
    });

  } catch (err) {
    console.error('Error fetching trends:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.get('/api/trending', async (req, res) => {
  try {
    const trending = await Product.find()
      .sort({ views: -1 }) // highest views first
      .limit(10);          // top 10 trending

    res.json(trending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/products/category/:category', async (req, res) => {
  const categoryParam = req.params.category.toLowerCase();

  try {
    // Find products matching the category (case insensitive)
    const products = await Product.find({
      category: { $regex: new RegExp(`^${categoryParam}$`, 'i') }
    })
    .sort({ createdAt: -1 });  // latest first, optional

    if (!products.length) {
      return res.status(404).json({ message: 'No products found for this category.' });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
app.get('/api/products/categories/all', async (req, res) => {
  try {
    const categoryKeys = ['women', 'men', 'kids', 'handbags', 'accessories'];
    const categoryData = {};

    for (let cat of categoryKeys) {
      const products = await Product.find({ category: cat }).sort({ createdAt: -1 });
      categoryData[cat] = products || [];
    }

    res.status(200).json(categoryData);
  } catch (error) {
    console.error('Error fetching products by categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



const cartSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
items: [
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },
  }
], 
coupon: {
  code: { type: String },
  discountType: { type: String },     
  discountValue: { type: Number },
  maxDiscount: { type: Number },
  appliedAt: { type: Date, default: Date.now }
}
});
app.get('/api/filters', async (req, res) => {
  try {
    const { category } = req.query;

    let query = {};

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query, 'variants');

    const sizesSet = new Set();
    const colorsSet = new Set();

    products.forEach(product => {
      (product.variants || []).forEach(variant => {
        if (variant.size) sizesSet.add(variant.size);
        if (variant.color) colorsSet.add(variant.color);
      });
    });

    res.json({
      sizes: [...sizesSet],
      colors: [...colorsSet],
    });
  } catch (err) {
    console.error("Error fetching filters:", err);
    res.status(500).json({ error: "Server error" });
  }
});



const Cart=mongoose.model("Cart", cartSchema, "Cart")

app.post('/api/addtocart', async (req, res) => {

  try {

    const {
      email,
      productId,
      variantId,
      quantity
    } = req.body;

    if (!email || !productId || !variantId || !quantity) {

      return res.status(400).json({
        success: false,
        message: 'Missing required fields.'
      });

    }

    const product = await Product.findById(productId);

    if (!product) {

      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });

    }

    const variant = product.variants.id(variantId);

    if (!variant) {

      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });

    }

    // if (variant.quantity < quantity) {

    //   return res.status(400).json({
    //     success: false,
    //     message: `Only ${variant.quantity} items left`
    //   });

    // }

    let cart = await Cart.findOne({ email });

    if (!cart) {

      cart = new Cart({
        email,
        items: [{
          productId,
          variantId,
          quantity
        }]
      });

    } else {

      const existingItem = cart.items.find(
        item =>
          item.productId.toString() === productId &&
          item.variantId.toString() === variantId
      );

      if (existingItem) {

        const newQty = existingItem.quantity + quantity;

        if (newQty > variant.quantity) {

          return res.status(400).json({
            success: false,
            message: `Only ${variant.quantity} items available`
          });

        }

        existingItem.quantity = newQty;

      } else {

        cart.items.push({
          productId,
          variantId,
          quantity
        });

      }

    }

    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Item added to cart.'
    });

 } catch (error) {
  console.error("Error adding to cart:", error);

res.status(500).json({
  success: false,
  message: error.message || "Something went wrong. Please try again."
});
}

});

app.get('/api/fetchcart/:email', async (req, res) => {
  try {
    const { email } = req.params;

    let cart = await Cart.findOne({ email }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        cart: [],
        subtotal: 0,
        totalBeforePromo: 0,
        couponDiscount: 0,
        finalTotal: 0,
        youSaved: 0,
        coupon: null
      });
    }

    // ====================== CALCULATE CART ITEMS ======================
    let totalBeforePromo = 0;

    const formattedCart = cart.items
      .filter(item => item.productId)
      .map(item => {
        const prod = item.productId;
        const variant = prod.variants.id(item.variantId);

        if (!variant) return null;

        const originalPrice = prod.originalPrice || 0;
        const discountPrice = prod.discountedPrice || originalPrice;

        const lineTotal = discountPrice * item.quantity;
        totalBeforePromo += lineTotal;

        return {
          productId: prod._id,
          variantId: item.variantId,
          title: prod.title,
          image: prod.mainImage,
          originalPrice,
          discountPrice,
          quantity: item.quantity,
          color: variant.color,
          size: variant.size,
          availableQuantity: variant.quantity
        };
      })
      .filter(Boolean);

    // ====================== VALIDATE & CLEAN COUPON ======================
    let validCoupon = null;

    if (cart.coupon?.code) {

      const dbCoupon = await Coupon.findOne({
        code: cart.coupon.code,
        active: true
      });

      const now = new Date();

      const invalidCoupon =
        !dbCoupon ||
        (dbCoupon.startDate && now < dbCoupon.startDate) ||
        (dbCoupon.expiryDate && now > dbCoupon.expiryDate) ||
        (dbCoupon.usedCount >= dbCoupon.totalUsageLimit) ||
        (totalBeforePromo < dbCoupon.minOrderAmount);

      if (invalidCoupon) {

        cart.coupon = null;
        await cart.save();

      } else {

        validCoupon = dbCoupon;

      }
    }

    // ====================== CALCULATE COUPON DISCOUNT ======================
    let couponDiscount = 0;

    if (validCoupon) {

      if (validCoupon.discountType === 'percent') {

        couponDiscount =
          (totalBeforePromo * validCoupon.discountValue) / 100;

        if (validCoupon.maxDiscount) {
          couponDiscount = Math.min(
            couponDiscount,
            validCoupon.maxDiscount
          );
        }

      } else {

        couponDiscount = validCoupon.discountValue;

      }
    }

    const finalTotal = Math.max(
      0,
      totalBeforePromo - couponDiscount
    );

    const youSaved = totalBeforePromo - finalTotal;

    res.status(200).json({
      cart: formattedCart,
      subtotal: totalBeforePromo,
      totalBeforePromo,
      couponDiscount,
      finalTotal,
      youSaved,

      coupon: validCoupon
        ? {
            code: validCoupon.code,
            discountType: validCoupon.discountType,
            discountValue: validCoupon.discountValue,
            maxDiscount: validCoupon.maxDiscount
          }
        : null
    });

  } catch (err) {
    console.error('Fetch cart error:', err);
    res.status(500).json({
      message: 'Server error.'
    });
  }
});



app.get('/api/cart-count/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const cart = await Cart.findOne({ email });

    const count = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

    res.status(200).json({ success: true, count });
  } catch (err) {
    console.error('Cart count fetch error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


app.delete('/api/removefromcart', async (req, res) => {

  try {

    const {
      email,
      productId,
      variantId
    } = req.body;

    const cart = await Cart.findOne({ email });

    if (!cart) {

      return res.status(404).json({
        message: 'Cart not found'
      });

    }

    cart.items = cart.items.filter(item => {

      return !(

        item.productId.toString() === productId &&
        item.variantId.toString() === variantId.toString()

      );

    });

    // Revalidate coupon after item removal
    await revalidateCartCoupon(cart);

    await cart.save();

    res.status(200).json({
      message: 'Item removed from cart.'
    });

  } catch (err) {

    console.error('Remove from cart error:', err);

    res.status(500).json({
      message: 'Server error.'
    });

  }

});
app.put('/api/updatecart', async (req, res) => {
  try {

    const {
      email,
      productId,
      variantId,
      quantity
    } = req.body;

    const cart = await Cart.findOne({ email });

    if (!cart) {
      return res.status(404).json({
        message: 'Cart not found'
      });
    }

    // Find product
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    // Find variant
    const variant = product.variants.id(variantId);

    if (!variant) {
      return res.status(404).json({
        message: 'Variant not found'
      });
    }

    // Stock validation
    if (quantity > variant.quantity) {
      return res.status(400).json({
        message: `Only ${variant.quantity} items available`
      });
    }

    // Find cart item
    const item = cart.items.find(
      item =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId.toString()
    );

    if (!item) {
      return res.status(404).json({
        message: 'Item not found in cart'
      });
    }

    item.quantity = quantity;

    // Revalidate coupon after quantity change
    await revalidateCartCoupon(cart);

    await cart.save();

    res.status(200).json({
      message: 'Cart updated'
    });

  } catch (err) {

    console.error('Update cart error:', err);

    res.status(500).json({
      message: 'Server error.'
    });

  }
});

const orderSchema = new mongoose.Schema({
  email: { type: String, required: true },
  orderNumber: {
    type: String,
    required: true,
    unique: true,
  },

  billing: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    country: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },

  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      title: String,
      originalPrice: Number,
      quantity: Number,
      discountPrice: Number,
      finalPaidAmount: {
  type: Number,
  default: 0,
},
    variantId: {
  type: mongoose.Schema.Types.ObjectId,
},

variant: {
  color: String,
  size: String,
},
      status: {
        type: String,
        enum: ["Pending", "Confirmed", "Cancelled", "Shipped", "Delivered", "Returned", "Return Requested"],
        default: "Pending",
      },
      isCancelled: { type: Boolean, default: false },
      cancellationReason: String,
      cancelledAt: Date,

      isReturned: { type: Boolean, default: false },
      returnReason: String,
      returnedAt: Date,
      returnInspected: {
  type: Boolean,
  default: false,
},

 refundStatus: {
  type: String,
  enum: [
    "Pending",
    "Processing",
    "Refunded",
    "Processed",
    "Failed",
    "Already Refunded",
    "Not Applicable",
  ],
  default: "Pending",
},
      bankDetails: {
        accountHolderName: { type: String },
        accountNumber: { type: String },
        ifscCode: { type: String },
        upiId: { type: String },
      },
      refundMethod: {
        type: String,
        enum: ["Razorpay", "Manual", "Cash", "UPI"],
        default: "Razorpay"
      },
 refundId: String,
refundCreatedAt: Date,
refundAmount: Number,

refundProcessing: {
  type: Boolean,
  default: false,
},
stockRestored: {
  type: Boolean,
  default: false,
},
refundIdempotencyKey: {
  type: String,
  default: null,
},
refundRequestedAmount: {
  type: Number,
  default: null,
},
    }
  ],
coupon: {
  code: String,
  discountType: String,
  discountValue: Number,
  maxDiscount: Number,
  minOrderAmount: Number,
},

  totalBeforeDiscount: Number,
  totalAfterDiscount: Number,
  promoDiscount: Number,
  finalTotal: Number,
  note: String,

  paymentMode: { type: String, enum: ["razorpay", "cod"], required: true },
  orderSource: {
  type: String,
  enum: ["CART", "BUY_NOW"],
  default: "CART",
},
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Cancelled", "Shipped", "Delivered", "Returned"],
    default: "Pending",
  },

  razorpayOrderId: String,
  isPaid: { type: Boolean, default: false },
  paymentProcessing: {
  type: Boolean,
  default: false,
},
  paidAt: Date,

  paymentInfo: {
    id: String,
    method: String,
    status: String,
  },

  deliveryCharge: {
    type: Number,
    default: 0,
  },
shiprocketOrderId: String,
shiprocketShipmentId: String,   // rename this

awbCode: String,
courierName: String,

trackingUrl: String,

shippingStatus: {
  type: String,
  enum: [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Returned",
    "Cancelled", 
    "Failed"
  ],
  default: "Pending"
},
pickupScheduled: {
  type: Boolean,
  default: false,
},

pickupScheduledAt: {
  type: Date,
  default: null,
},

pickupTokenNumber: {
  type: String,
  default: null,
},
manifestUrl: {
  type: String,
  default: null,
},

manifestGenerated: {
  type: Boolean,
  default: false,
},
labelUrl: {
  type: String,
  default: null,
},

labelGenerated: {
  type: Boolean,
  default: false,
},
isTestOrder: {
  type: Boolean,
  default: false
}, 

shippingProcessing: {
  type: Boolean,
  default: false,
},

shippingCreationStatus: {
  type: String,
  enum: [
    "Not Started",
    "Creating",
    "Created",
    "Manual Review"
  ],
  default: "Not Started"
},


  createdAt: { type: Date, default: Date.now },

// === REFUND HANDLING ===
totalRefunded: {
  type: Number,
  default: 0,
},
totalRefundable: {
  type: Number,
  default: 0,
},

// Order-level lock to prevent concurrent refunds
refundProcessing: {
  type: Boolean,
  default: false,
},
refundLockVariantId: {
  type: String,
  default: null,
},

shipmentCancellationStatus: {
  type: String,
  enum: [
    "Not Requested",
    "Pending",
    "Cancelled",
    "Failed",
    "Not Required",
    "Too Late"
  ],
  default: "Not Requested"
},
shipmentCancellationRequestedAt: {
  type: Date,
  default: null
},
shipmentCancellationError: {
  type: String,
  default: null
},

// Return shipment / reverse pickup
returnShiprocketOrderId: {
  type: String,
  default: null
},
returnShiprocketShipmentId: {
  type: String,
  default: null
},
returnAwbCode: {
  type: String,
  default: null
},
returnCourierName: {
  type: String,
  default: null
},
returnTrackingUrl: {
  type: String,
  default: null
},
returnPickupStatus: {
  type: String,
  enum: [
    "Not Requested",
    "Pending",
    "Booked",
    "Picked Up",
    "In Transit",
    "Delivered",
    "Failed",
    "Cancelled"
  ],
  default: "Not Requested"
},
returnPickupRequestedAt: {
  type: Date,
  default: null
},


});



const Order = mongoose.model("Order", orderSchema, "Order");

app.post("/api/create-razorpay-order", async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        message: "Order ID is required",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.isPaid) {
      return res.status(400).json({
        message: "This order has already been paid",
      });
    }

    // Calculate the amount on the backend in paise.
    const payableAmount =
      Number(order.finalTotal) + Number(order.deliveryCharge || 0);

    const amountInPaise = Math.round(payableAmount * 100);

    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      return res.status(400).json({
        message: "Invalid order amount",
      });
    }

    // Reuse the existing Razorpay order if one was already created.
    if (order.razorpayOrderId) {
      const existingRazorpayOrder =
        await razorpay.orders.fetch(order.razorpayOrderId);

      return res.status(200).json(existingRazorpayOrder);
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: order.orderNumber,
    });

    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.status(200).json(razorpayOrder);
  } catch (error) {
    console.error(
      "Razorpay order creation error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      message: "Razorpay order creation failed",
    });
  }
});

app.post("/api/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
      paymentMethod,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Missing orderId" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

if (order.isPaid) {
  return res.status(400).json({
    success: false,
    message: "Order already paid",
  });
}


    
if (!order.razorpayOrderId) {
  return res.status(400).json({
    success: false,
    message: "No Razorpay order is linked to this order.",
  });
}

if (order.razorpayOrderId !== razorpay_order_id) {
  return res.status(400).json({
    success: false,
    message: "Razorpay order does not match the database order.",
  });
}

// Verify the expected amount using the server-side order total
const expectedAmountPaise = Math.round(
  (Number(order.finalTotal) + Number(order.deliveryCharge || 0)) * 100
);

try {
  const razorpayOrder = await razorpay.orders.fetch(
    razorpay_order_id
  );

  if (
    razorpayOrder.amount !== expectedAmountPaise ||
    razorpayOrder.currency !== "INR"
  ) {
    return res.status(400).json({
      success: false,
      message: "Payment amount mismatch",
    });
  }
} catch (err) {
  console.error(
    "Razorpay order verification error:",
    err.message
  );

  return res.status(400).json({
    success: false,
    message: "Unable to verify Razorpay order",
  });
}

    // ================= SIGNATURE VERIFY =================
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
    }
    // Verify that the payment was actually captured.
let verifiedPayment;

try {
  verifiedPayment = await razorpay.payments.fetch(
    razorpay_payment_id
  );
} catch (err) {
  return res.status(400).json({
    success: false,
    message: "Unable to verify Razorpay payment",
  });
}

if (
  verifiedPayment.order_id !== razorpay_order_id ||
  verifiedPayment.status !== "captured" ||
  verifiedPayment.amount !== expectedAmountPaise ||
  verifiedPayment.currency !== "INR"
) {
  return res.status(400).json({
    success: false,
    message: "Payment is not captured or payment details do not match",
  });
}
const lockedOrder = await Order.findOneAndUpdate(
  {
    _id: order._id,
    isPaid: false,
    paymentProcessing: false,
  },
  {
    $set: { paymentProcessing: true },
  },
  { new: true }
);
if (!lockedOrder) {
  return res.status(409).json({
    success: false,
    message: "Payment verification is already in progress. Please try again shortly.",
  });
}


    // ================= STOCK REDUCTION =================
    const stockDeductions = [];

    try {
      for (const item of order.items) {
        const quantity = Number(item.quantity);

        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(`Invalid quantity for ${item.title}`);
        }

        // Atomically reduce stock only when sufficient stock exists.
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: item.productId,
            variants: {
              $elemMatch: {
                _id: item.variantId,
                quantity: { $gte: quantity },
              },
            },
          },
          {
            $inc: {
              "variants.$.quantity": -quantity,
            },
          },
          { new: true }
        );

        if (!updatedProduct) {
          const productExists = await Product.exists({
            _id: item.productId,
          });

          if (!productExists) {
            throw new Error(`${item.title} not found`);
          }

          throw new Error(
            `Insufficient stock or missing variant for ${item.title}`
          );
        }

        stockDeductions.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity,
        });
      }
    } catch (stockError) {
      // Restore any stock already deducted by this attempt.
      for (const deduction of stockDeductions.reverse()) {
        await Product.updateOne(
          {
            _id: deduction.productId,
            variants: {
              $elemMatch: { _id: deduction.variantId },
            },
          },
          {
            $inc: {
              "variants.$[variant].quantity": deduction.quantity,
            },
          },
          {
            arrayFilters: [
              { "variant._id": deduction.variantId },
            ],
          }
        ).catch((rollbackError) => {
          console.error(
            "CRITICAL: Stock rollback failed:",
            rollbackError.message
          );
        });
      }

      await Order.updateOne(
        { _id: order._id, isPaid: false },
        { $set: { paymentProcessing: false } }
      );

      console.error("Stock deduction failed:", stockError.message);

      return res.status(400).json({
        success: false,
        message:
          "We could not reserve all items in this order. Please contact support before retrying if your payment was deducted.",
      });
    }



// ================= UPDATE ORDER =================
order.isPaid = true;
order.paymentProcessing = false;
order.paidAt = new Date();
order.status = "Confirmed";

    order.paymentInfo = {
      id: razorpay_payment_id,
      method: paymentMethod || "razorpay",
      status: "success",
    };

    await order.save();
    // Send an email to the store owner after successful payment
await sendOrderNotification(order);
await sendCustomerOrderConfirmation(order);
    console.log("PAYMENT SAVED:", {
  orderId: order._id.toString(),
  isPaid: order.isPaid,
  paymentProcessing: order.paymentProcessing,
});

    // ================= MARK COUPON AS USED - IMPROVED =================
    if (order.coupon?.code) {
      try {
        const couponCode = order.coupon.code;

        // 1. Increment global usage count
        await Coupon.findOneAndUpdate(
          { code: couponCode },
          { $inc: { usedCount: 1 } }
        );

        // 2. Increment user's usage count (if exists)
        const incrementResult = await User.findOneAndUpdate(
          { 
            email: order.email, 
            "usedCoupons.couponCode": couponCode 
          },
          { 
            $inc: { "usedCoupons.$.count": 1 } 
          }
        );

        // 3. If user is using this coupon for the first time, add new entry
        if (!incrementResult) {
          await User.findOneAndUpdate(
            { email: order.email },
            {
              $push: {
                usedCoupons: {
                  couponCode: couponCode,
                  count: 1
                }
              }
            }
          );
        }

        console.log(`✅ Coupon ${couponCode} usage updated successfully`);
      } catch (couponErr) {
        console.error("Coupon usage marking failed:", couponErr.message);
        // Do not fail the payment flow
      }
    }

    // ================= SHIPROCKET =================
    try {
      await shipOrderToShiprocket(order._id);
    } catch (err) {
      console.log("Shiprocket error:", err.message);
      order.shippingStatus = "Failed";
      await order.save().catch(() => {});
    }

    // ================= CLEAR CART =================
    await Cart.findOneAndUpdate(
      { email: order.email },
      { $set: { items: [], coupon: null } }
    ).catch(err => console.log("Cart clear warning:", err.message));

    return res.status(200).json({
      success: true,
      message: "Payment verified and order confirmed",
    });

} catch (error) {
  console.error("Verify payment error:", error);

  // Release the lock only if payment has not been confirmed.
  if (req.body?.orderId) {
    await Order.updateOne(
      {
        _id: req.body.orderId,
        isPaid: false,
        paymentProcessing: true,
      },
      {
        $set: { paymentProcessing: false },
      }
    ).catch((unlockError) => {
      console.error(
        "Failed to release payment lock:",
        unlockError.message
      );
    });
  }

  return res.status(500).json({
    success: false,
    message: "Payment verification failed",
  });
}
});
app.post("/api/validate-order", async (req, res) => {
  try {
    const { email, password, buyNowItem } = req.body;

    // 1. Check user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // 2. Check password
    const isValidPassword = await user.comparePassword(password);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Incorrect password",
      });
    }

    // =========================
    // BUY NOW VALIDATION
    // =========================
    if (buyNowItem) {
      const product = await Product.findById(
        buyNowItem.productId
      );

      if (!product) {
        return res.status(400).json({
          message: "Product not found",
        });
      }

      const variant = product.variants.id(
        buyNowItem.variantId
      );

      if (!variant) {
        return res.status(400).json({
          message: "Variant not found",
        });
      }

      if (variant.quantity < buyNowItem.quantity) {
        return res.status(400).json({
          message: `Only ${variant.quantity} left in stock`,
        });
      }
    }

    // =========================
    // CART VALIDATION
    // =========================
    else {
      const cartData = await Cart.findOne({ email }).populate(
        "items.productId"
      );

      if (!cartData || cartData.items.length === 0) {
        return res.status(400).json({
          message: "Cart is empty",
        });
      }

      for (const item of cartData.items) {
        const product = item.productId;

        if (!product) {
          return res.status(400).json({
            message: "Some products unavailable",
          });
        }

        const variant = product.variants.id(
          item.variantId
        );

        if (!variant) {
          return res.status(400).json({
            message: `Variant unavailable for ${product.title}`,
          });
        }

        if (variant.quantity < item.quantity) {
          return res.status(400).json({
            message: `Only ${variant.quantity} left for ${product.title}`,
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
    });

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Validation failed",
    });
  }
});

app.post("/api/placeorder", async (req, res) => {
  try {
   const {
  email,
  billingDetails,
  password,
  note,
  paymentMode,
  buyNowItem,
  razorpayOrderId,
} = req.body;

    // ================= USER VALIDATION =================
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) return res.status(401).json({ message: "Incorrect password" });

    let totalBefore = 0;      // Original price total (for "You Saved")
    let totalAfter = 0;       // After product discount but before coupon
    let promoDiscount = 0;
    let appliedCoupon = null;
    const orderItems = [];

    // ====================================================
    // BUY NOW FLOW (No coupon support)
    // ====================================================
    if (buyNowItem) {
      const product = await Product.findById(buyNowItem.productId);
      if (!product) return res.status(400).json({ message: "Product not found" });

      const variant = product.variants.id(buyNowItem.variantId);
      if (!variant) return res.status(400).json({ message: "Variant not found" });
      if (variant.quantity < buyNowItem.quantity) {
        return res.status(400).json({ message: `Only ${variant.quantity} left in stock` });
      }

      const quantity = Number(buyNowItem.quantity);
      const originalPrice = Number(product.originalPrice || 0);
      const discountedPrice = Number(product.discountedPrice || originalPrice);

      totalBefore = originalPrice * quantity;
      totalAfter = discountedPrice * quantity;

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        title: product.title,
        originalPrice,
        discountPrice: discountedPrice,
        quantity,
        finalPaidAmount: discountedPrice * quantity,
        variant: { color: variant.color, size: variant.size },
        coupon: null,
      });
    } 
    // ====================================================
    // CART FLOW - FIXED
    // ====================================================
    else {
      const cartData = await Cart.findOne({ email }).populate("items.productId");
      if (!cartData || cartData.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

appliedCoupon = null;

if (cartData.coupon?.code) {
  const code = cartData.coupon.code.trim().toUpperCase();

  const dbCoupon = await Coupon.findOne({
    code,
    active: true,
  });

  if (!dbCoupon) {
    return res.status(400).json({
      message: "The applied coupon is no longer valid. Please apply it again.",
    });
  }

  const now = new Date();

  if (dbCoupon.startDate && now < dbCoupon.startDate) {
    return res.status(400).json({
      message: "This coupon is not active yet.",
    });
  }

  if (dbCoupon.expiryDate && now > dbCoupon.expiryDate) {
    return res.status(400).json({
      message: "This coupon has expired. Please remove it and try again.",
    });
  }

  if (
    dbCoupon.totalUsageLimit != null &&
    dbCoupon.usedCount >= dbCoupon.totalUsageLimit
  ) {
    return res.status(400).json({
      message: "This coupon has reached its usage limit.",
    });
  }

  const couponUser = await User.findOne({ email });

  if (!couponUser) {
    return res.status(404).json({
      message: "User not found.",
    });
  }

  const usage = couponUser.usedCoupons.find(
    (entry) => entry.couponCode === code
  );

  const usedByUser = usage ? Number(usage.count || 0) : 0;

  if (usedByUser >= dbCoupon.usageLimitPerUser) {
    return res.status(400).json({
      message: "You have reached the usage limit for this coupon.",
    });
  }

  appliedCoupon = dbCoupon;
}

      let cartSubtotal = 0;   // After product discount

      // First loop: Calculate totals + build order items
      for (const cartItem of cartData.items) {
        const product = cartItem.productId;
        if (!product) return res.status(400).json({ message: "Some products unavailable" });

        const variant = product.variants.id(cartItem.variantId);
        if (!variant) return res.status(400).json({ message: `Variant unavailable for ${product.title}` });
        if (variant.quantity < cartItem.quantity) {
          return res.status(400).json({ message: `Only ${variant.quantity} left for ${product.title}` });
        }

        const quantity = Number(cartItem.quantity);
        const originalPrice = Number(product.originalPrice || 0);
        const discountedPrice = Number(product.discountedPrice || originalPrice);

        totalBefore += originalPrice * quantity;
        cartSubtotal += discountedPrice * quantity;

        orderItems.push({
          productId: product._id,
          variantId: variant._id,
          title: product.title,
          originalPrice,
          discountPrice: discountedPrice,
          quantity,
          finalPaidAmount: discountedPrice * quantity, // will adjust later if needed
          variant: { color: variant.color, size: variant.size },
        coupon: appliedCoupon ? {
  code: appliedCoupon.code,
  discountType: appliedCoupon.discountType,
  discountValue: appliedCoupon.discountValue,
  maxDiscount: appliedCoupon.maxDiscount,
  minOrderAmount: appliedCoupon.minOrderAmount
} : null,
        });
      }


      // =========================================
      // VALIDATE COUPON MINIMUM ORDER AMOUNT
      // =========================================

      totalAfter = Number(cartSubtotal.toFixed(2));

      if (
        appliedCoupon &&
        cartSubtotal < Number(appliedCoupon.minOrderAmount || 0)
      ) {
        return res.status(400).json({
          message: `Minimum order amount ₹${appliedCoupon.minOrderAmount} is required for this coupon.`,
        });
      }

      // =========================================
      // CALCULATE COUPON DISCOUNT
      // =========================================

      promoDiscount = 0;

      if (appliedCoupon) {
        const discountValue = Number(appliedCoupon.discountValue || 0);

        if (appliedCoupon.discountType === "percent") {
          promoDiscount = (cartSubtotal * discountValue) / 100;

          if (appliedCoupon.maxDiscount != null) {
            promoDiscount = Math.min(
              promoDiscount,
              Number(appliedCoupon.maxDiscount)
            );
          }
        } else if (appliedCoupon.discountType === "fixed") {
          promoDiscount = discountValue;
        }

        // Discount cannot exceed the product subtotal.
        promoDiscount = Math.min(
          Math.max(0, promoDiscount),
          cartSubtotal
        );
      }

      promoDiscount = Number(promoDiscount.toFixed(2));


      // =========================================
      // ALLOCATE COUPON DISCOUNT TO EACH ITEM
      // =========================================

      const subtotalPaise = Math.round(cartSubtotal * 100);
      const discountPaise = Math.min(
        subtotalPaise,
        Math.round(promoDiscount * 100)
      );

      const itemSubtotalsPaise = orderItems.map((item) =>
        Math.round(
          Number(item.discountPrice) *
          Number(item.quantity) *
          100
        )
      );

      const itemDiscountsPaise = itemSubtotalsPaise.map(
        () => 0
      );

      let remainingDiscountPaise = discountPaise;

      // First, allocate the proportional discount.
      if (subtotalPaise > 0 && discountPaise > 0) {
        for (let i = 0; i < itemSubtotalsPaise.length; i++) {
          const share = Math.floor(
            (itemSubtotalsPaise[i] * discountPaise) /
            subtotalPaise
          );

          itemDiscountsPaise[i] = Math.min(
            itemSubtotalsPaise[i],
            share
          );

          remainingDiscountPaise -= itemDiscountsPaise[i];
        }

        // Distribute leftover paise without making an item negative.
        for (
          let i = 0;
          i < itemSubtotalsPaise.length &&
          remainingDiscountPaise > 0;
          i++
        ) {
          const available =
            itemSubtotalsPaise[i] - itemDiscountsPaise[i];

          const extra = Math.min(
            available,
            remainingDiscountPaise
          );

          itemDiscountsPaise[i] += extra;
          remainingDiscountPaise -= extra;
        }
      }

      // Save each item's final amount after its coupon share.
      orderItems.forEach((item, index) => {
        item.finalPaidAmount = Number(
          (
            (itemSubtotalsPaise[index] -
              itemDiscountsPaise[index]) /
            100
          ).toFixed(2)
        );
      });

      // Safety check: all item amounts must equal finalTotal.
      const itemsTotalPaise = orderItems.reduce(
        (sum, item) =>
          sum + Math.round(Number(item.finalPaidAmount) * 100),
        0
      );

      const expectedItemsTotalPaise = Math.round(
        (totalAfter - promoDiscount) * 100
      );

      if (itemsTotalPaise !== expectedItemsTotalPaise) {
        throw new Error(
          "Order item totals do not match the final order total"
        );
      }


    }

    // ====================================================
    // FINAL TOTALS
    // ====================================================
  const finalTotal = Number(
  Math.max(0, totalAfter - promoDiscount).toFixed(2)
);

    // ====================================================
    // DELIVERY CHARGE
    // ====================================================

const city = billingDetails.city?.trim().toLowerCase() || "";
const state = billingDetails.state?.trim().toLowerCase() || "";

let deliveryCharge = 75;

// Free delivery for Phagwara orders of ₹1,000 or more
const isPhagwaraPunjab =
  city === "phagwara" && state === "punjab";

if (isPhagwaraPunjab && finalTotal >= 1000) {
  deliveryCharge = 0;
} else {
  // Initial state-based classification for hilly regions
  const hillyStates = [
    "himachal pradesh",
    "uttarakhand",
    "jammu and kashmir",
    "jammu & kashmir",
    "ladakh",
    "sikkim",
    "arunachal pradesh",
  ];

  if (hillyStates.includes(state)) {
    deliveryCharge = 95;
  }
}


    // ====================================================
    // CREATE ORDER
    // ====================================================
    const newOrder = new Order({
      email,
      billing: {
        firstName: billingDetails.firstName,
        lastName: billingDetails.lastName,
        country: billingDetails.country,
        addressLine1: billingDetails.address,
        addressLine2: billingDetails.apartment,
        city: billingDetails.city,
        state: billingDetails.state,
        zip: billingDetails.zip,
        phone: billingDetails.phone,
        email: billingDetails.email,
      },
      items: orderItems,
   coupon: appliedCoupon ? {
  code: appliedCoupon.code,
  discountType: appliedCoupon.discountType,
  discountValue: appliedCoupon.discountValue,
  maxDiscount: appliedCoupon.maxDiscount,
  minOrderAmount: appliedCoupon.minOrderAmount
} : null,
      totalBeforeDiscount: totalBefore,
      totalAfterDiscount: totalAfter,
      promoDiscount,
      finalTotal: finalTotal,                    // Amount before delivery
      totalRefundable: finalTotal + deliveryCharge,
      note,
      paymentMode,
      orderSource: buyNowItem ? "BUY_NOW" : "CART",
      status: paymentMode === "cod" ? "Confirmed" : "Pending",
      deliveryCharge,
      razorpayOrderId: razorpayOrderId || null,
      isPaid: false,
      shippingStatus: "Pending",
      paymentInfo: {
        id: razorpayOrderId || null,
        method: paymentMode === "cod" ? "cod" : "razorpay",
        status: paymentMode === "cod" ? "pending" : "created",
      },
    });

    const shortId = newOrder._id.toString().slice(-6).toUpperCase();
    newOrder.orderNumber = `ORD-2026-${shortId}`;

    await newOrder.save();

    // ====================================================
    // STOCK REDUCTION + CART CLEAR (Only for COD)
    // ====================================================
    if (paymentMode === "cod") {
      for (const item of orderItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        const variant = product.variants.id(item.variantId);
        if (!variant) continue;

        variant.quantity -= item.quantity;
        if (variant.quantity < 0) variant.quantity = 0;
        await product.save({ validateBeforeSave: false });
      }

      if (!buyNowItem) {
        await Cart.findOneAndUpdate(
          { email },
          { $set: { items: [], coupon: null } }
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: {
        _id: newOrder._id,
        orderNumber: newOrder.orderNumber,
      }
    });

  } catch (error) {
    console.error("Place order error:", error);
    return res.status(500).json({ message: "Failed to place order" });
  }
});



app.get('/api/uorders/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const orders = await Order.find({
      email,
      $or: [
        { isPaid: true },
        { paymentMode: 'cod' },
        {
          paymentMode: { $nin: ['razorpay', 'cod'] }
        }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('items.productId', 'mainImage');

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return res.status(500).json({
      message: "Failed to fetch orders."
    });
  }
});



app.post('/api/rate/:productId', upload.single('image'), async (req, res) => {
  let uploadedPublicId = null; // track uploaded file
  try {
    const { email, rating, comment } = req.body;
    const { productId } = req.params;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === user._id.toString()
    );
    if (alreadyReviewed) {
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename);
      }
      return res.status(400).json({ error: 'You have already reviewed this product.' });
    }

    // Track uploaded image so we can rollback if save fails
    if (req.file) {
      uploadedPublicId = req.file.filename; // Cloudinary public_id
    }

    const newReview = {
      user: user._id,
      name: user.name,
      rating: Number(rating),
      comment,
      image: req.file
        ? {
            url: req.file.path,       // Cloudinary URL
            publicId: req.file.filename, // Cloudinary public_id
          }
        : null,
    };

    product.reviews.push(newReview);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.numReviews;

    await product.save({ validateModifiedOnly: true });

    res.status(201).json({ message: 'Review submitted', review: newReview });
  } catch (err) {
    console.error('Submit review error:', err);

    // 🔑 Rollback Cloudinary file if review save fails
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId);
        console.log('Rolled back Cloudinary image:', uploadedPublicId);
      } catch (cloudErr) {
        console.error('Cloudinary cleanup failed:', cloudErr);
      }
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});






app.get('/api/rate/:productId/:email', async (req, res) => {
  try {
    const { productId, email } = req.params;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find product
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Find user's review
    const review = product.reviews.find(
      r => r.user.toString() === user._id.toString()
    );

    if (!review) return res.status(404).json({ message: 'No review found' });

    return res.status(200).json({ review }); // Includes name, comment, rating, image
  } catch (err) {
    console.error('Error fetching review:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const productId = req.params.id;
    // Fetch only reviews field for performance
    const product = await Product.findById(productId).select('reviews');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json({ reviews: product.reviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/return/:orderId', async (req, res) => {
  try {
    const { reason, variantId, bankDetails } = req.body;

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const item = order.items.find(
      (i) => i.variantId?.toString() === variantId?.toString()
    );

    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    if (order.paymentMode !== "razorpay" && order.paymentMode !== "cod") {
      return res.status(400).json({ message: "Unsupported payment method" });
    }

    if (item.status !== "Delivered") {
      return res.status(400).json({
        message: "Only delivered items can be returned",
      });
    }

    if (item.isReturned || item.status === "Return Requested") {
      return res.status(400).json({
        message: "A return request already exists for this item",
      });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({
        message: "Please provide a return reason",
      });
    }

    // Record the request, but do NOT approve the return yet.
    item.status = "Return Requested";
    item.isReturned = false;
    item.returnReason = String(reason).trim();
    item.returnedAt = new Date();
    item.refundStatus = "Pending";
    item.refundMethod =
      order.paymentMode === "cod" ? "Manual" : "Razorpay";

    if (order.paymentMode === "cod" && bankDetails) {
      item.bankDetails = bankDetails;
    }

await order.save();

await sendOrderStatusEmails(
  order,
  item,
  "return-requested"
);

return res.json({
  success: true,
  message: "Return request submitted successfully. Waiting for admin approval.",
});
  } catch (err) {
    console.error("Return Error:", err);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

app.post("/api/cancel/:orderId", async (req, res) => {
  try {
    const { reason, variantId } = req.body || {};

    if (!variantId) {
      return res.status(400).json({
        success: false,
        message: "Variant ID is required",
      });
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const item = order.items.find(
      (entry) =>
        entry.variantId?.toString() === variantId.toString()
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Order item not found",
      });
    }

    // Prevent duplicate cancellation requests.
    if (item.isCancelled || item.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "This item is already cancelled",
      });
    }

    if (!["Pending", "Confirmed"].includes(item.status)) {
      return res.status(400).json({
        success: false,
        message: "This item can no longer be cancelled",
      });
    }

    // Prevent another request while a refund is being processed.
    if (
      ["Processing", "Refunded", "Processed"].includes(
        item.refundStatus
      ) ||
      item.refundProcessing === true
    ) {
      return res.status(409).json({
        success: false,
        message: "A refund is already being processed for this item",
      });
    }

    // Preserve the existing same-day cancellation rule.
    const now = new Date();
    const orderDate = new Date(order.createdAt);

    if (now.toDateString() !== orderDate.toDateString()) {
      return res.status(400).json({
        success: false,
        message: "Cancellation is only allowed on the order date",
      });
    }

    if (reason && typeof reason !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid cancellation reason",
      });
    }

    const paymentMode = String(order.paymentMode || "").toLowerCase();

    if (!["razorpay", "cod"].includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported payment method",
      });
    }

    // Save the reason, but do not mark a paid item cancelled yet.
    item.cancellationReason = String(reason || "").trim();
    item.cancelledAt = now;

    // COD orders do not require an online refund.
    // Restore stock only if it has not already been restored.
    if (paymentMode === "cod" || !order.isPaid) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const currentOrder = await Order.findOne({
            _id: order._id,
            items: {
              $elemMatch: {
                variantId: item.variantId,
                isCancelled: { $ne: true },
                stockRestored: { $ne: true },
              },
            },
          }).session(session);

          if (!currentOrder) {
            throw new Error(
              "The item was already cancelled or its stock was restored"
            );
          }

          const currentItem = currentOrder.items.find(
            (entry) =>
              entry.variantId?.toString() ===
              item.variantId.toString()
          );

          if (!currentItem) {
            throw new Error("Order item not found");
          }

          const stockUpdate = await Product.updateOne(
            {
              _id: currentItem.productId,
              "variants._id": currentItem.variantId,
            },
            {
              $inc: {
                "variants.$.quantity": currentItem.quantity,
              },
            },
            { session }
          );

          if (stockUpdate.matchedCount !== 1) {
            throw new Error("Product variant not found");
          }

          currentItem.status = "Cancelled";
          currentItem.isCancelled = true;
          currentItem.stockRestored = true;
          currentItem.refundStatus = "Not Applicable";
          currentItem.refundMethod =
            paymentMode === "cod" ? "Manual" : "Razorpay";

          const allCancelled = currentOrder.items.every(
            (entry) =>
              entry.isCancelled ||
              entry.status === "Cancelled"
          );

          if (allCancelled) {
            currentOrder.status = "Cancelled";
          }

          await currentOrder.save({ session });
        });
      } finally {
        await session.endSession();
      }

 
      // Ask Shiprocket to cancel only if all order items are cancelled.
      // A Shiprocket failure must not undo the successful item cancellation.
      let shipmentCancellation = null;

      try {
        shipmentCancellation =
          await requestShiprocketCancellationIfEligible(order._id);

      } catch (shippingError) {
        console.error(
          "Shipment cancellation handling error:",
          shippingError
        );
      }

      // Send cancellation emails to the admin and customer.
      const updatedOrder = await Order.findById(order._id);

      const updatedItem = updatedOrder?.items.find(
        (entry) =>
          entry.variantId?.toString() === variantId.toString()
      );

      if (updatedOrder && updatedItem) {
        await sendOrderStatusEmails(
          updatedOrder,
          updatedItem,
          "cancelled"
        );
      }

      return res.json({
        success: true,
        message: "Item cancelled successfully",
        refundStatus: "Not Applicable",
        shipmentCancellationStatus:
          shipmentCancellation?.status || "Not Requested",
      });


    }

    // A paid Razorpay order must have a payment ID.
    if (!order.paymentInfo?.id) {
      return res.status(400).json({
        success: false,
        message: "Payment details are missing; cancellation needs review",
      });
    }

    // Never refund delivery charges automatically.
    // This uses the item's recorded paid amount only.
    const refundAmount = Number(item.finalPaidAmount);

    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid item refund amount could not be calculated",
      });
    }

    const payment = await razorpay.payments.fetch(
      order.paymentInfo.id
    );

    if (payment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: "The payment is not captured and cannot be refunded",
      });
    }

    const paymentAmount = Number(payment.amount) / 100;
    const alreadyRefunded = Number(payment.amount_refunded || 0) / 100;

    if (refundAmount > paymentAmount - alreadyRefunded) {
      return res.status(400).json({
        success: false,
        message: "The requested refund exceeds the available balance",
      });
    }
    // Atomically lock this item before starting its refund.

    // Atomically lock the entire order before starting a refund.
    const lockResult = await Order.updateOne(
      {
        _id: order._id,
        refundProcessing: { $ne: true },
        items: {
          $elemMatch: {
            variantId: item.variantId,
            status: { $in: ["Pending", "Confirmed"] },
            isCancelled: { $ne: true },
            refundProcessing: { $ne: true },
            refundStatus: {
              $nin: ["Processing", "Refunded", "Processed"],
            },
          },
        },
      },
      {
        $set: {
          refundProcessing: true,
          refundLockVariantId: item.variantId.toString(),
          "items.$.refundStatus": "Processing",
          "items.$.refundMethod": "Razorpay",
          "items.$.refundRequestedAmount": refundAmount,
          "items.$.refundProcessing": true,
          "items.$.cancellationReason": String(reason || "").trim(),
          "items.$.cancelledAt": now,
        },
      }
    );

    if (lockResult.modifiedCount !== 1) {
      return res.status(409).json({
        success: false,
        message:
          "A refund is already being processed for this order, or this item cannot be cancelled.",
      });
    }


    // Set a processing state before making the external refund request.
    // A production-safe implementation must also acquire an atomic
    // database lock before reaching this point.


    let refund;

    try {
      refund = await razorpay.payments.refund(
        order.paymentInfo.id,
        {
          amount: Math.round(refundAmount * 100),
          notes: {
            orderId: order._id.toString(),
            variantId: item.variantId.toString(),
            reason: String(reason || "Customer cancellation").trim(),
          },
        }
      );
   } catch (refundError) {
  console.error("Razorpay cancellation refund error:", refundError);

  // The refund outcome is uncertain. Keep the database lock
  // until the refund is checked and reconciled.
  return res.status(202).json({
    success: false,
    message:
      "The refund could not be confirmed yet. It needs to be checked before retrying.",
    refundStatus: "Processing",
  });
}

    item.refundId = refund.id;
    item.refundCreatedAt = refund.created_at
      ? new Date(refund.created_at * 1000)
      : new Date();

    if (refund.status === "processed") {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const currentOrder = await Order.findById(order._id).session(
            session
          );

          if (!currentOrder) {
            throw new Error("Order not found during refund confirmation");
          }

          const currentItem = currentOrder.items.find(
            (entry) =>
              entry.variantId?.toString() ===
              item.variantId.toString()
          );

          if (!currentItem) {
            throw new Error("Order item not found during refund confirmation");
          }
// If this exact refund was already recorded, don't count it again.
if (
  currentItem.refundStatus === "Refunded" &&
  currentItem.refundId === refund.id
) {
  return;
}
if (
  currentItem.refundStatus !== "Processing" ||
  currentItem.refundProcessing !== true ||
  currentOrder.refundProcessing !== true ||
  currentOrder.refundLockVariantId !==
    currentItem.variantId.toString()
) {
  throw new Error(
    "Refund lock is missing; manual reconciliation is required"
  );
}


          // Idempotency guard: don't restore stock twice.
          if (!currentItem.stockRestored) {
            const stockUpdate = await Product.updateOne(
              {
                _id: currentItem.productId,
                "variants._id": currentItem.variantId,
              },
              {
                $inc: {
                  "variants.$.quantity": currentItem.quantity,
                },
              },
              { session }
            );

            if (stockUpdate.matchedCount !== 1) {
              throw new Error("Product variant not found");
            }

            currentItem.stockRestored = true;
          }

      currentItem.status = "Cancelled";
currentItem.isCancelled = true;
currentItem.refundStatus = "Refunded";
currentItem.refundAmount = refundAmount;
currentItem.refundProcessing = false;
currentItem.refundMethod = "Razorpay";
currentItem.refundId = refund.id;
currentItem.refundCreatedAt = refund.created_at
  ? new Date(refund.created_at * 1000)
  : new Date();

          currentOrder.totalRefunded =
            Number(currentOrder.totalRefunded || 0) + refundAmount;
            // Release the order-level refund lock after confirmation.
currentOrder.refundProcessing = false;
currentOrder.refundLockVariantId = null;

          const allCancelled = currentOrder.items.every(
            (entry) =>
              entry.isCancelled ||
              entry.status === "Cancelled"
          );

          if (allCancelled) {
            currentOrder.status = "Cancelled";
          }

          await currentOrder.save({ session });
        });
      } finally {
        await session.endSession();
      }


      // The item cancellation and refund have been saved successfully.
      // Now handle shipment cancellation separately.
      let shipmentCancellation = null;

      try {
        shipmentCancellation =
          await requestShiprocketCancellationIfEligible(order._id);

      } catch (shippingError) {
        console.error(
          "Shipment cancellation handling error:",
          shippingError
        );
      }

      // Send emails only after the refund and cancellation are confirmed.
      const updatedOrder = await Order.findById(order._id);

      const updatedItem = updatedOrder?.items.find(
        (entry) =>
          entry.variantId?.toString() === variantId.toString()
      );

      if (updatedOrder && updatedItem) {
        await sendOrderStatusEmails(
          updatedOrder,
          updatedItem,
          "cancelled"
        );
      }

      return res.json({
        success: true,
        message: "Cancellation and refund completed successfully",
        refundStatus: "Refunded",
        shipmentCancellationStatus:
          shipmentCancellation?.status || "Not Requested",
      });


    }

    // Razorpay accepted the request, but has not confirmed completion.
// Update the latest saved item without overwriting other changes.
await Order.updateOne(
  {
    _id: order._id,
    items: {
      $elemMatch: {
        variantId: item.variantId,
        refundStatus: "Processing",
        refundProcessing: true,
      },
    },
  },
  {
    $set: {
      "items.$.refundStatus":
        refund.status === "failed" ? "Failed" : "Processing",
      "items.$.refundProcessing": refund.status !== "failed",
      "items.$.refundId": refund.id,
      "items.$.refundCreatedAt": refund.created_at
        ? new Date(refund.created_at * 1000)
        : new Date(),
       // Keep the order locked until the refund outcome is reviewed.
refundProcessing: true,
refundLockVariantId: item.variantId.toString(),
    },
  }
);

    return res.status(202).json({
      success: false,
      message:
        refund.status === "failed"
          ? "The refund failed. The item has not been cancelled."
          : "The refund is still processing. The item will be cancelled after confirmation.",
      refundStatus:
  refund.status === "failed" ? "Failed" : "Processing",
    });
  } catch (error) {
    console.error("Cancellation Error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not process the cancellation",
    });
  }
});


app.post(
  "/api/admin/refund/:orderId",
  verifyAdmin,
  async (req, res) => {
    let lockAcquired = false;
    let refundRequestStarted = false;
    let refundApiSucceeded = false;
    let lockedOrderId = null;
    let lockedVariantId = null;

    const releaseRefundLock = async () => {
      if (!lockAcquired || !lockedOrderId) return;

      await Order.updateOne(
        {
          _id: lockedOrderId,
          refundProcessing: true,
          refundLockVariantId: String(lockedVariantId),
        },
        {
          $set: {
            refundProcessing: false,
            refundLockVariantId: null,
            "items.$[item].refundProcessing": false,
          },
        },
        {
          arrayFilters: [
            {
              "item.variantId": lockedVariantId,
            },
          ],
        }
      );

      lockAcquired = false;
    };

    try {
      const { variantId, amount } = req.body;

      if (!variantId) {
        return res.status(400).json({
          message: "Variant ID is required",
        });
      }

      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      if (order.paymentMode !== "razorpay") {
        return res.status(400).json({
          message: "Only prepaid Razorpay orders can use this refund route",
        });
      }

      if (!order.paymentInfo?.id || !order.isPaid) {
        return res.status(400).json({
          message: "No verified paid Razorpay payment exists for this order",
        });
      }

      const item = order.items.find(
        (i) =>
          i.variantId?.toString() === variantId.toString()
      );

      if (!item) {
        return res.status(404).json({
          message: "Item not found",
        });
      }


      // The item must be inspected before refund approval.
      if (
        item.status !== "Return Requested" ||
        item.isReturned
      ) {
        return res.status(400).json({
          message: "This item does not have a pending return request",
        });
      }

      if (item.returnInspected !== true) {
        return res.status(400).json({
          message: "Inspect and approve the returned item for resale before issuing a refund",
        });
      }


      if (item.refundStatus !== "Pending") {
        return res.status(409).json({
          message: `Refund cannot start. Current status: ${item.refundStatus}`,
        });
      }

      const itemPaidAmount = Number(item.finalPaidAmount);

      if (
        !Number.isFinite(itemPaidAmount) ||
        itemPaidAmount <= 0
      ) {
        return res.status(400).json({
          message: "The item's final paid amount is invalid",
        });
      }

 
const refundAmount = Number(itemPaidAmount.toFixed(2));

// Only full-item refunds are allowed.
if (
  !Number.isFinite(refundAmount) ||
  refundAmount <= 0
) {
  return res.status(400).json({
    message: "The item's final paid amount is invalid",
  });
}


      // Reuse an existing key and amount if an earlier attempt
      // was recorded for this same item.
      const existingKey = item.refundIdempotencyKey;
      const existingAmount = item.refundRequestedAmount;

      if (
        existingKey &&
        existingAmount != null &&
        Math.round(Number(existingAmount) * 100) !==
          Math.round(refundAmount * 100)
      ) {
        return res.status(409).json({
          message: "A previous refund attempt used a different amount. Reconcile it before trying another amount.",
        });
      }

      const idempotencyKey =
        existingKey || `refund_${crypto.randomUUID()}`;

      const requestedAmount =
        existingAmount != null
          ? Number(existingAmount)
          : refundAmount;

      // Acquire one lock for the whole order. This prevents two
      // different item refunds from checking the same balance.
      const lockedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          refundProcessing: { $ne: true },
          items: {
            $elemMatch: {
              variantId: item.variantId,
              status: "Return Requested",
              isReturned: { $ne: true },
              refundStatus: "Pending",
              refundProcessing: { $ne: true },
            },
          },
        },
        {
          $set: {
            refundProcessing: true,
            refundLockVariantId: String(item.variantId),
            "items.$.refundProcessing": true,
            "items.$.refundIdempotencyKey": idempotencyKey,
            "items.$.refundRequestedAmount": requestedAmount,
          },
        },
        { new: true }
      );

      if (!lockedOrder) {
        return res.status(409).json({
          message: "Another refund is processing, or this return is no longer eligible.",
        });
      }

      lockAcquired = true;
      lockedOrderId = lockedOrder._id;
      lockedVariantId = item.variantId;

      const refundItem = lockedOrder.items.find(
        (i) =>
          i.variantId?.toString() === variantId.toString()
      );

      if (!refundItem) {
        await releaseRefundLock();

        return res.status(404).json({
          message: "Item not found after acquiring refund lock",
        });
      }

      // Always verify the current payment with Razorpay.
      let payment;

      try {
        payment = await razorpay.payments.fetch(
          lockedOrder.paymentInfo.id
        );
      } catch (error) {
        await releaseRefundLock();
        throw error;
      }

      if (payment.status !== "captured") {
        await releaseRefundLock();

        return res.status(400).json({
          message: "Razorpay payment has not been captured",
        });
      }

      const totalPaidPaise = Number(payment.amount);
      const alreadyRefundedPaise = Number(
        payment.amount_refunded || 0
      );

      if (
        !Number.isFinite(totalPaidPaise) ||
        !Number.isFinite(alreadyRefundedPaise) ||
        totalPaidPaise <= 0
      ) {
        await releaseRefundLock();

        return res.status(400).json({
          message: "Could not verify the payment amount",
        });
      }

      // Count existing in-progress refunds as committed amounts.
      // This prevents another item from using the same balance.
      const pendingOtherRefundsPaise =
        lockedOrder.items.reduce((sum, currentItem) => {
          if (
            currentItem.variantId?.toString() ===
              variantId.toString()
          ) {
            return sum;
          }

          if (currentItem.refundStatus !== "Processing") {
            return sum;
          }

          const pendingAmount = Number(
            currentItem.refundAmount ??
              currentItem.refundRequestedAmount ??
              0
          );

          return sum + Math.round(pendingAmount * 100);
        }, 0);

      const databaseRefundedPaise = Math.round(
        Number(lockedOrder.totalRefunded || 0) * 100
      );

  
const committedRefundedPaise = Math.max(
  alreadyRefundedPaise,
  databaseRefundedPaise + pendingOtherRefundsPaise
);

const remainingPaise =
  totalPaidPaise - committedRefundedPaise;


      const requestedPaise = Math.round(
        requestedAmount * 100
      );

  if (
  requestedPaise <= 0 ||
  requestedPaise > remainingPaise
) {
        await releaseRefundLock();

        return res.status(400).json({
          message: `Refund exceeds the remaining refundable balance of ₹${Math.max(0, remainingPaise / 100).toFixed(2)}`,
        });
      }

      // From this point, a network failure can mean Razorpay
      // received the request even if we did not receive a response.
      refundRequestStarted = true;

      const refund = await createRazorpayRefund({
        paymentId: lockedOrder.paymentInfo.id,
        amountPaise: requestedPaise,
        idempotencyKey,
        receipt: `ret_${lockedOrder._id}_${refundItem.variantId}`,
      });

      refundApiSucceeded = true;

      // Update the FRESH, LOCKED document—not the stale original.
      refundItem.refundId = refund.id;
      refundItem.refundCreatedAt = refund.created_at
        ? new Date(refund.created_at * 1000)
        : new Date();
      refundItem.refundAmount = requestedAmount;
      refundItem.refundMethod = "Razorpay";

      if (refund.status === "processed") {
        refundItem.refundStatus = "Refunded";
        refundItem.status = "Returned";
        refundItem.isReturned = true;

        lockedOrder.totalRefunded =
          Number(lockedOrder.totalRefunded || 0) +
          requestedAmount;
} else if (refund.status === "pending") {
  refundItem.refundStatus = "Processing";

  // The physical return may have been accepted, but the
  // refund is not confirmed yet.
  refundItem.status = "Return Requested";
  refundItem.isReturned = false;
} else if (refund.status === "failed") {
        refundItem.refundStatus = "Failed";

        // The return was not completed by this failed refund.
        refundItem.status = "Return Requested";
        refundItem.isReturned = false;
      } else {
        // Unknown provider state: don't permit another refund
        // until this transaction has been reconciled.
        refundItem.refundStatus = "Processing";
        refundItem.status = "Returned";
        refundItem.isReturned = true;
      }

      refundItem.refundProcessing = false;

      // Save the item and release the order lock together.
      // If this save fails after Razorpay succeeds, preserve the
      // lock so another refund cannot use the same balance.
      if (refund.status === "processed") {
        lockedOrder.totalRefunded = Math.round(
          lockedOrder.totalRefunded * 100
        ) / 100;
      }

      lockedOrder.refundProcessing =
        refund.status === "pending" ||
        refund.status === "processed" ||
        refund.status === "failed"
          ? false
          : true;

      lockedOrder.refundLockVariantId =
        lockedOrder.refundProcessing
          ? String(refundItem.variantId)
          : null;

   
// Update the overall order status only after a confirmed refund.
if (refund.status === "processed") {
  const allItemsReturnedOrCancelled = lockedOrder.items.every(
    (currentItem) =>
      currentItem.status === "Returned" ||
      currentItem.status === "Cancelled"
  );

  if (allItemsReturnedOrCancelled) {
    lockedOrder.status = "Returned";
  }
}

await lockedOrder.save();

// Restore stock only after the refund is confirmed and
// the returned shoes have been inspected.
let stockRestoreResult = null;

if (
  refund.status === "processed" &&
  refundItem.refundStatus === "Refunded" &&
  refundItem.status === "Returned" &&
  refundItem.isReturned === true &&
  refundItem.returnInspected === true
) {
  try {
    stockRestoreResult = await restoreReturnedItemStock(
      lockedOrder._id,
      refundItem.variantId
    );

    if (!stockRestoreResult?.success) {
      console.warn(
        "Refund processed, but stock restoration was not confirmed:",
        lockedOrder._id.toString(),
        refundItem.variantId.toString()
      );
    } else {
      console.log(
        "Returned item stock restored successfully:",
        lockedOrder._id.toString(),
        refundItem.variantId.toString()
      );
    }
  } catch (stockError) {
    // The refund has already succeeded. Do not report it as failed
    // or attempt to issue another refund.
    console.error(
      "Stock restoration failed after successful refund:",
      stockError
    );
  }
}

lockAcquired = lockedOrder.refundProcessing;



      return res.status(200).json({
        success: true,
        message:
          refund.status === "processed"
            ? "Refund processed successfully"
            : refund.status === "pending"
            ? "Refund initiated and is awaiting Razorpay confirmation"
            : refund.status === "failed"
            ? "Razorpay reported that the refund failed"
            : "Refund submitted; its status needs reconciliation",
        refundAmount: requestedAmount,
        refundId: refund.id,
        refundStatus: refundItem.refundStatus,
      });
    } catch (error) {
      console.error("Admin Refund Error:", error);

      // Release the lock when no refund request was sent, or when
      // Razorpay clearly rejected it with a non-conflict 4xx error.
      // Preserve it when the outcome may be uncertain.
      const definiteRejection =
        Number.isInteger(error.status) &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 409;

      if (
        lockAcquired &&
        !refundApiSucceeded &&
        (!refundRequestStarted || definiteRejection)
      ) {
        try {
          await releaseRefundLock();
        } catch (unlockError) {
          console.error(
            "Failed to release refund lock:",
            unlockError
          );
        }
      }

      return res.status(500).json({
        message:
          refundApiSucceeded
            ? "Razorpay may have accepted the refund, but the database update failed. Reconcile the refund before retrying."
            : refundRequestStarted
            ? "Refund outcome is uncertain. Do not submit another refund until the Razorpay status has been checked."
            : error?.error?.description ||
              error.message ||
              "Refund failed",
      });
    }
  }
);

app.post(
  "/api/admin/return-pickup/:orderId",
  verifyAdmin,
  async (req, res) => {
    let order;

    try {
      order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      const variantId = req.body.variantId;

      const item = order.items.find(
        (entry) =>
          String(entry.variantId) === String(variantId)
      );

      if (!item) {
        return res.status(404).json({
          message: "Return item not found",
        });
      }

      if (item.status !== "Return Requested") {
        return res.status(400).json({
          message: "This item has no pending return request",
        });
      }

      if (item.isReturned || item.status === "Returned") {
        return res.status(400).json({
          message: "This item has already been returned",
        });
      }

      if (order.returnPickupStatus === "Pending") {
        return res.status(409).json({
          message: "Return pickup is already being processed",
        });
      }

      if (
        order.returnPickupStatus !== "Not Requested" &&
        order.returnPickupStatus !== "Failed"
      ) {
        return res.status(409).json({
          message:
            "A return shipment already exists. Check Shiprocket before proceeding.",
          returnPickupStatus: order.returnPickupStatus,
          returnAwbCode: order.returnAwbCode,
        });
      }

      // Reserve this order before calling Shiprocket.
      const reservedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          returnPickupStatus: order.returnPickupStatus,
        },
        {
          $set: {
            returnPickupStatus: "Pending",
            returnPickupRequestedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!reservedOrder) {
        return res.status(409).json({
          message: "Another request is handling this return",
        });
      }

      // LIVE Shiprocket API call: this can book a real pickup.
      const result = await createShiprocketReturnShipment(
        reservedOrder,
        item
      );

      console.log("SHIPROCKET RETURN RESPONSE:", result);

      const payload = result?.payload;

      if (
        result?.status !== 1 ||
        !payload?.shipment_id ||
        !payload?.order_id ||
        !payload?.awb_code
      ) {
        // The API may have created a shipment despite an
        // incomplete response. Do not blindly retry it.
        reservedOrder.returnPickupStatus = "Pending";
        await reservedOrder.save();

        return res.status(502).json({
          message:
            "Shiprocket response needs checking. Verify the return in Shiprocket before retrying.",
        });
      }

      reservedOrder.returnShiprocketOrderId =
        String(payload.order_id);

      reservedOrder.returnShiprocketShipmentId =
        String(payload.shipment_id);

      reservedOrder.returnAwbCode =
        String(payload.awb_code);

      reservedOrder.returnCourierName =
        payload.courier_name || null;

      reservedOrder.returnPickupStatus =
        payload.pickup_generated === 1
          ? "Booked"
          : "Pending";

      await reservedOrder.save();

      return res.status(200).json({
        message:
          reservedOrder.returnPickupStatus === "Booked"
            ? "Return pickup booked successfully"
            : "Return shipment created; pickup needs checking",
        returnPickupStatus:
          reservedOrder.returnPickupStatus,
        returnAwbCode: reservedOrder.returnAwbCode,
        returnCourierName: reservedOrder.returnCourierName,
      });
    } catch (error) {
      console.error(
        "Return pickup error:",
        error.response?.data || error.message
      );

      // Do not mark an uncertain live API request as safely
      // retryable. Check Shiprocket first if the request timed out.
      if (order) {
        await Order.updateOne(
          {
            _id: order._id,
            returnPickupStatus: "Pending",
            returnShiprocketShipmentId: { $in: [null, ""] },
          },
          {
            $set: {
              returnPickupStatus: "Pending",
            },
          }
        );
      }

      return res.status(500).json({
        message:
          "Return pickup could not be confirmed. Check Shiprocket before retrying.",
      });
    }
  }
);



app.get('/api/search', async (req, res) => {
  const { q, minPrice, maxPrice, sizes, colors } = req.query;

  if (!q) return res.json([]);

  const priceFilter = {};
  if (!isNaN(parseFloat(minPrice))) priceFilter.$gte = parseFloat(minPrice);
  if (!isNaN(parseFloat(maxPrice))) priceFilter.$lte = parseFloat(maxPrice);

  const query = {
    $and: [
      {
        $or: [
          { title: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } },
          { category: { $regex: q, $options: 'i' } }
        ]
      },
      ...(Object.keys(priceFilter).length > 0
        ? [{ discountedPrice: priceFilter }]
        : [])
    ]
  };

  // Add size filter if provided
  if (sizes) {
    const sizesArray = sizes.split(',');
    query.$and.push({ sizes: { $in: sizesArray } });
  }

  // Add color filter if provided
  if (colors) {
    const colorsArray = colors.split(',');
    query.$and.push({ colors: { $in: colorsArray } });
  }

  try {
    const results = await Product.find(query).limit(10);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error during search' });
  }
});


app.get('/api/category-counts', async (req, res) => {
  try {
    const counts = await Product.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const formatted = {};
    counts.forEach(({ _id, count }) => {
      formatted[_id] = count;
    });

    res.json(formatted); // { women: 12, men: 8, kids: 6, handbags: 3, accessories: 10 }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category counts' });
  }
});
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  adminname: { type: String, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['superadmin', 'admin'],
    default: 'admin'
  }
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Admin=mongoose.model("Admin", adminSchema, "Admin")
app.post('/api/adminregister', async (req, res) => {
  try {
    const { email, password, adminname } = req.body;

    // Check if superadmin already exists
    const superadminExists = await Admin.findOne({ role: 'superadmin' });
    if (superadminExists) {
      return res.status(403).json({ error: 'Superadmin already exists' });
    }

    // Check if admin with email already exists
    const exists = await Admin.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    // Create new admin with role superadmin
    const newAdmin = new Admin({
      email,
      password,
      adminname,
      role: 'superadmin', // Force superadmin only for this route
    });

    await newAdmin.save();

    res.status(201).json({ message: 'Superadmin registered successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

app.post('/api/adminlogin', async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        adminname: admin.adminname
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 🔽 Just send plain token
    res.json({ token });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});


app.get('/api/admin/products/all', verifyAdmin, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }); // optional sort

    res.status(200).json(products);
  } catch (err) {
    console.error('Admin Fetch All Products Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.put(
  '/api/products/updatevariantstock/:productId/:variantId',
  async (req, res) => {
    try {
      const { quantity } = req.body;

      const product = await Product.findById(
        req.params.productId
      );

      if (!product) {
        return res.status(404).json({
          message: 'Product not found'
        });
      }

      const variant = product.variants.id(
        req.params.variantId
      );

      if (!variant) {
        return res.status(404).json({
          message: 'Variant not found'
        });
      }

      variant.quantity = Number(quantity);

      await product.save();

      res.status(200).json({
        success: true,
        message: 'Stock updated',
        product
      });

    } catch (err) {
      console.error(err);

      res.status(500).json({
        message: 'Server error'
      });
    }
  }
);
app.get('/api/adminproducts/:id', verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    console.error('Error fetching product by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.get('/api/admincategories', async (req, res) => {
  try {
    const defaultCategories = ["men", "women", "kids", "handbags", "accessories"];

    // Get distinct categories from products
    let categoriesFromDB = await Product.distinct("category");

    // Merge and remove duplicates
    let allCategories = [...new Set([...categoriesFromDB, ...defaultCategories])];

    res.status(200).json(allCategories);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Server error while fetching categories" });
  }
});

const deleteFileIfExists = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`Deleted: ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
};

app.delete('/api/deleteproduct/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Delete mainImage from Cloudinary
    if (product.mainImage?.publicId) {
      await cloudinary.uploader.destroy(product.mainImage.publicId);
    }

    // Delete otherImages
    if (Array.isArray(product.otherImages)) {
      for (const img of product.otherImages) {
        if (img.publicId) {
          await cloudinary.uploader.destroy(img.publicId);
        }
      }
    }

    // Delete review images
    if (Array.isArray(product.reviews)) {
      for (const rev of product.reviews) {
        if (rev.image?.publicId) {
          await cloudinary.uploader.destroy(rev.image.publicId);
        }
      }
    }

    await product.deleteOne();
    res.status(200).json({ success: true, message: 'Product and images deleted.' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Server error during deletion.' });
  }
});

app.put(
  "/api/products/:id",
  productUpload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "otherImages", maxCount: 4 },
  ]),
  async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Parse variants from frontend
      let variants = [];
      if (req.body.variants) {
        variants = JSON.parse(req.body.variants);
      }

      const updatedFields = {
        title: req.body.title,
        brand: req.body.brand,
        category: req.body.category,
        description: req.body.description,
        originalPrice: Number(req.body.originalPrice),
        discountedPrice: Number(req.body.discountedPrice),
        promoCode: req.body.promoCode || null,
        promoDiscountPercent: Number(req.body.promoDiscountPercent || 0),
        label: req.body.label,
        specifications: req.body.specifications,
        variants: variants,   // ← Important: Update variants
      };

      // 🔹 Handle Main Image Update
      if (req.files["mainImage"] && req.files["mainImage"][0]) {
        // Delete old main image
        if (product.mainImage?.publicId) {
          await cloudinary.uploader.destroy(product.mainImage.publicId);
        }

        const newMain = req.files["mainImage"][0];
        updatedFields.mainImage = {
          url: newMain.path || newMain.secure_url || newMain.url,
          publicId: newMain.filename || newMain.public_id,
        };
      }

      // 🔹 Handle Other Images (Replace all if new ones are uploaded)
      if (req.files["otherImages"] && req.files["otherImages"].length > 0) {
        // Delete old other images
        if (product.otherImages?.length) {
          for (const img of product.otherImages) {
            if (img.publicId) await cloudinary.uploader.destroy(img.publicId);
          }
        }

        updatedFields.otherImages = req.files["otherImages"].map((file) => ({
          url: file.path || file.secure_url || file.url,
          publicId: file.filename || file.public_id,
        }));
      }

      // Update product
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updatedFields,
        { new: true, runValidators: true }
      );

      return res.json({
        success: true,
        message: "Product updated successfully",
        product: updatedProduct,
      });

    } catch (err) {
      console.error("Product Update Error:", err);
      return res.status(500).json({ 
        error: "Failed to update product",
        details: err.message 
      });
    }
  }
);



app.get('/api/admin/orders', async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('items.productId', 'mainImage slug');

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});
app.put('/api/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Status updated', order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, 'name email phone role');
  res.json(users);
});
app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});


app.put("/api/orders/:orderId/item/:itemIndex/status", async (req, res) => {
  const { orderId, itemIndex } = req.params;
  const { status } = req.body;

  try {
    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Cancellation and returns must use their dedicated workflows.",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const index = Number(itemIndex);

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= order.items.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid item index",
      });
    }

    const item = order.items[index];

    // Prevent fulfilment updates for unpaid Razorpay orders.
    if (
      String(order.paymentMode || "").toLowerCase() === "razorpay" &&
      !order.isPaid
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot update fulfilment status for an unpaid order.",
      });
    }

    // Cancelled and returned items use their dedicated workflows.
    if (item.isCancelled || item.isReturned) {
      return res.status(400).json({
        success: false,
        message: "Cancelled or returned items cannot be updated here.",
      });
    }

    // Prevent moving a delivered item backwards.
    if (item.status === "Delivered" && status !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "A delivered item cannot be moved to an earlier status.",
      });
    }

    // Update the selected item.
    item.status = status;

    // Exclude cancelled and returned items when calculating
    // the overall fulfilment progress.
    const activeItems = order.items.filter(
      (orderItem) =>
        !orderItem.isCancelled && !orderItem.isReturned
    );

    if (activeItems.length > 0) {
      const allDelivered = activeItems.every(
        (orderItem) => orderItem.status === "Delivered"
      );

      const allPending = activeItems.every(
        (orderItem) => orderItem.status === "Pending"
      );

      const allConfirmed = activeItems.every(
        (orderItem) => orderItem.status === "Confirmed"
      );

      const allShippedOrDelivered = activeItems.every(
        (orderItem) =>
          ["Shipped", "Delivered"].includes(orderItem.status)
      );

if (allDelivered) {
  order.status = "Delivered";
} else if (allShippedOrDelivered) {
  order.status = "Shipped";
} else if (allConfirmed) {
  order.status = "Confirmed";
} else if (allPending) {
  order.status = "Pending";
} else {
  order.status = "Processing";
}
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Item and order statuses updated successfully",
      order,
    });
  } catch (err) {
    console.error("Item status update error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update item status",
    });
  }
});


app.put('/api/products/updatestock/:id', async (req, res) => {
  const { quantity, stockStatus } = req.body;
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { quantity, stockStatus },
      { new: true }
    );
    res.json(updatedProduct);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update stock' });
  }
});
app.post('/api/admin/superadmin/addadmin', verifyAdmin, async (req, res) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ message: 'Only superadmin can add new admins' });
  }

  const { email, adminname, password } = req.body;

  if (!email || !adminname || !password) {
    return res.status(400).json({ message: 'All fields required' });
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: 'Admin already exists' });
  }

  // ❌ Remove manual hashing
  const newAdmin = new Admin({
    email,
    adminname,
    password, // will be hashed automatically by pre-save hook
    role: 'admin'
  });

  await newAdmin.save();

  res.status(201).json({ message: 'Admin created successfully' });
});

app.post('/api/admin/changepassword', async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const isMatch = await admin.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    admin.password = newPassword;
    await admin.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Admin Change Password Error:", err);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
});
// ====================== SAVED ADDRESSES APIs ======================
app.get('/api/addresses', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ 
      success: true,
      addresses: user.addresses || [] 
    });
  } catch (error) {
    console.error("Fetch addresses error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// 2. Save New Address - FIXED
app.post('/api/addresses', async (req, res) => {
  try {
    const { email, firstName, lastName, country, address, apartment, 
            city, state, zip, phone, isDefault } = req.body;

    console.log("Received data:", req.body); // ← Helpful for debugging

    if (!email || !firstName || !lastName || !address || !city || !state || !zip || !phone) {
      return res.status(400).json({ 
        message: "Missing required fields. Please check all fields." 
      });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Reset default flag on other addresses
    if (isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      country: country || "IN",
      addressLine1: address.trim(),        // ← Mapped from frontend 'address'
      addressLine2: apartment ? apartment.trim() : "",  // ← Mapped from frontend 'apartment'
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      phone: phone.trim(),
      isDefault: isDefault || (user.addresses.length === 0)
    });

    await user.save();

    res.json({ 
      success: true,
      message: "Address saved successfully", 
      addresses: user.addresses 
    });
  } catch (error) {
    console.error("Save address error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to save address",
      error: error.message 
    });
  }
});
// 3. Delete an Address
app.delete('/api/addresses/:addressId', async (req, res) => {
  try {
    const { email } = req.query;
    const { addressId } = req.params;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
    
    // If no default left, make first address default
    if (user.addresses.length > 0 && !user.addresses.some(a => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json({ message: "Address deleted", addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete address" });
  }
});
app.get("/api/test-shiprocket-token", async (req, res) => {
  try {
    const token = await getShiprocketToken();
    res.json({ token });
  } catch (err) {
    console.log(err.response?.data || err);
    res.status(500).json(err.response?.data || err.message);
  }
});
app.get("/api/test-shiprocket-order/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const result = await createShiprocketOrder(order);

    res.json(result);
  } catch (err) {
    console.log(err.response?.data || err);
    res.status(500).json(err.response?.data || err.message);
  }
});

app.post(
  "/api/admin/returns/:orderId/mark-delivered",
  verifyAdmin,
  async (req, res) => {
    try {
      const { variantId } = req.body || {};

      if (!variantId) {
        return res.status(400).json({
          message: "Variant ID is required.",
        });
      }

      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return res.status(404).json({
          message: "Order not found.",
        });
      }

      const item = order.items.find(
        (entry) =>
          String(entry.variantId) === String(variantId)
      );

      if (!item) {
        return res.status(404).json({
          message: "Return item not found.",
        });
      }

      if (item.status !== "Return Requested" || item.isReturned) {
        return res.status(400).json({
          message: "This item does not have an active return request.",
        });
      }

      if (!order.returnAwbCode) {
        return res.status(400).json({
          message: "No return AWB exists for this shipment.",
        });
      }

      if (order.returnPickupStatus === "Delivered") {
        return res.json({
          success: true,
          message: "Return is already marked as delivered.",
        });
      }

      if (
        !["Booked", "Picked Up", "In Transit"].includes(
          order.returnPickupStatus
        )
      ) {
        return res.status(400).json({
          message:
            "The return pickup must be booked before marking it delivered.",
          returnPickupStatus: order.returnPickupStatus,
        });
      }

      order.returnPickupStatus = "Delivered";
      await order.save();

      return res.json({
        success: true,
        message:
          "Return marked as delivered. You can now inspect the item.",
      });
    } catch (error) {
      console.error("Mark return delivered error:", error);

      return res.status(500).json({
        message: "Could not update the return delivery status.",
      });
    }
  }
);

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    unique: true,
    uppercase: true,
    required: true
  },

  discountType: {
    type: String,
    enum: ['percent', 'fixed'],
    default: 'percent'
  },

  discountValue: {
    type: Number,
    required: true
  },

  minOrderAmount: {
    type: Number,
    default: 0
  },

  maxDiscount: {
    type: Number,
    default: null
  },

  totalUsageLimit: {
    type: Number,
    default: 100
  },

  usedCount: {
    type: Number,
    default: 0
  },

  usageLimitPerUser: {
    type: Number,
    default: 1
  },

  active: {
    type: Boolean,
    default: true
  },

  startDate: Date,

  expiryDate: Date
},
{
  timestamps: true
});
const Coupon = mongoose.model('Coupon', couponSchema);
app.post('/api/apply-coupon', async (req, res) => {
  try {
    const { email, coupon: rawCode } = req.body;
    const code = rawCode?.trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    // Fetch cart
    const cart = await Cart.findOne({ email }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Check coupon exists and active
    const couponDoc = await Coupon.findOne({ code, active: true });
    if (!couponDoc) {
      return res.status(400).json({ message: 'Invalid coupon code' });
    }

    // Fetch user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // ================= DATE VALIDATION =================
    const now = new Date();
    if (couponDoc.startDate && now < couponDoc.startDate) {
      return res.status(400).json({ message: 'Coupon is not active yet' });
    }
    if (couponDoc.expiryDate && now > couponDoc.expiryDate) {
      return res.status(400).json({ message: 'Coupon expired' });
    }

    // ================= GLOBAL USAGE LIMIT =================
    if (couponDoc.usedCount >= couponDoc.totalUsageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    // ================= PER USER USAGE LIMIT =================
    const userUsage = user.usedCoupons.find(u => u.couponCode === code);
    const userUsedCount = userUsage ? userUsage.count : 0;

    if (userUsedCount >= couponDoc.usageLimitPerUser) {
      return res.status(400).json({
        message: `You have already used this coupon maximum times (${couponDoc.usageLimitPerUser})`
      });
    }

    // ================= MINIMUM ORDER AMOUNT =================
    const cartTotal = cart.items.reduce((sum, item) => {
      const price = item.productId.discountedPrice || item.productId.originalPrice || 0;
      return sum + (price * item.quantity);
    }, 0);

    if (cartTotal < couponDoc.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount ₹${couponDoc.minOrderAmount} required`
      });
    }

    // ================= APPLY COUPON TO CART =================
    cart.coupon = {
      code: couponDoc.code,
      discountType: couponDoc.discountType,
      discountValue: couponDoc.discountValue,
      maxDiscount: couponDoc.maxDiscount,
      appliedAt: new Date()
    };

    await cart.save();

    res.status(200).json({
      success: true,
      coupon: cart.coupon,
      message: 'Coupon applied successfully'
    });

  } catch (err) {
    console.error('Apply coupon error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
// Remove Coupon
app.post('/api/remove-coupon', async (req, res) => {
  try {
    const { email } = req.body;

    const cart = await Cart.findOne({ email });
    if (cart) {
      cart.coupon = null;
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Coupon removed successfully'
    });
  } catch (err) {
    console.error('Remove coupon error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/api/admin/coupons', async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      coupon
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }
});
app.get('/api/admin/coupons', async (req, res) => {
  try {

    const coupons = await Coupon.find()
      .sort({ createdAt: -1 });

    res.json(coupons);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
});
app.delete('/api/admin/coupons/:id', async (req, res) => {
  try {

    await Coupon.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Coupon deleted'
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
});
app.put('/api/admin/coupons/:id', async (req, res) => {
  try {

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(coupon);

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }
});
app.get("/api/test", (req, res) => {
  res.json({ message: "Working" });
});

module.exports = app;
module.exports.handler = serverless(app);

