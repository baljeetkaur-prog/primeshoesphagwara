
import { jsPDF } from "jspdf";

const formatINR = (amount) =>
  `Rs. ${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getOrderNumber = (order) =>
  order.orderNumber || `ORD-${String(order._id || "").slice(-6).toUpperCase()}`;

const getItemName = (item) =>
  item.productId?.title || item.title || "Product";

const getItemPrice = (item) => {
  // Your My Orders page already uses finalPaidAmount.
  if (item.finalPaidAmount !== undefined && item.finalPaidAmount !== null) {
    return Number(item.finalPaidAmount) || 0;
  }

  return (
    Number(item.discountPrice ?? item.originalPrice ?? 0) *
    Number(item.quantity || 1)
  );
};

async function loadLogo() {
  try {
    const response = await fetch("/img/prime-logo.png");

    if (!response.ok) return null;

    const blob = await response.blob();

    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Could not load receipt logo:", error);
    return null;
  }
}

export async function downloadReceipt(order) {
  if (!order || !order._id) {
    throw new Error("Order details are unavailable.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const right = pageWidth - margin;
  const billing = order.billing || {};
  const items = Array.isArray(order.items) ? order.items : [];

  const itemSubtotal = items.reduce(
    (sum, item) => sum + getItemPrice(item),
    0
  );

  const deliveryCharge = Number(
    order.deliveryCharge ?? order.shippingCharge ?? 0
  );

  // Prefer a saved order-level total. The fallback uses the saved item totals
  // plus delivery; it does not use the customer's current cart.
  const savedTotal =
    order.grandTotal ??
    order.totalWithDelivery ??
    order.finalAmount ??
    order.totalAmount;

  const total =
    savedTotal !== undefined && savedTotal !== null
      ? Number(savedTotal)
      : Number(order.finalTotal ?? itemSubtotal) + deliveryCharge;

  const orderNumber = getOrderNumber(order);
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString("en-IN")
    : new Date().toLocaleString("en-IN");

  const logo = await loadLogo();

  // Brand header
  doc.setFillColor(248, 248, 246);
  doc.rect(0, 0, pageWidth, 48, "F");

if (logo) {
  try {
    const imageProps = doc.getImageProperties(logo);
    const logoWidth = 30;
    const logoHeight =
      (imageProps.height / imageProps.width) * logoWidth;

    doc.addImage(
      logo,
      "JPEG",
      margin,
      12,
      logoWidth,
      Math.min(logoHeight, 16),
      undefined,
      "FAST"
    );
  } catch (error) {
    console.warn("Could not add logo to PDF:", error);
  }
}

  doc.setTextColor(35, 35, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PAYMENT RECEIPT", right, 17, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(95, 95, 95);
  doc.text("PRIME SHOES", right, 24, { align: "right" });
  doc.text(`Receipt / Order: ${orderNumber}`, right, 31, {
    align: "right",
  });
  doc.text(`Order date: ${orderDate}`, right, 37, {
    align: "right",
  });

  // Payment status
  const paymentStatus = String(
    order.paymentStatus ||
    order.payment_status ||
    (order.isPaid === true ? "Paid" : "See order status")
  );

  doc.setTextColor(35, 35, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CUSTOMER DETAILS", margin, 61);

  doc.setDrawColor(225, 225, 225);
  doc.line(margin, 65, right, 65);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(65, 65, 65);

  let y = 72;
  const customerName =
    `${billing.firstName || ""} ${billing.lastName || ""}`.trim() ||
    "Customer";

  const customerLines = [
    customerName,
    billing.email || order.email || "",
    billing.phone || "",
    billing.addressLine1 || billing.address || "",
    billing.addressLine2 || billing.apartment || "",
    [billing.city, billing.state, billing.zip].filter(Boolean).join(", "),
    billing.country || "",
  ].filter(Boolean);

  customerLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(String(line), 105);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 5;
  });

  y += 8;

  // Items table
  const col = {
    item: margin,
    qty: 127,
    price: 148,
    amount: right,
  };

  doc.setFillColor(40, 40, 40);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 10, 1, 1, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("PRODUCT", col.item + 3, y + 6.5);
  doc.text("QTY", col.qty, y + 6.5, { align: "center" });
  doc.text("UNIT PRICE", col.price, y + 6.5, { align: "right" });
  doc.text("AMOUNT", col.amount - 3, y + 6.5, { align: "right" });

  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);

  items.forEach((item) => {
    const quantity = Number(item.quantity || 1);
    const amount = getItemPrice(item);
    const unitPrice = quantity > 0 ? amount / quantity : amount;

    const variantParts = [];
    if (item.variant?.size || item.size) {
      variantParts.push(`Size: ${item.variant?.size || item.size}`);
    }
    if (item.variant?.color || item.color) {
      variantParts.push(`Color: ${item.variant?.color || item.color}`);
    }

    const productLabel = [
      getItemName(item),
      ...variantParts,
    ].filter(Boolean).join(" - ");

    const wrappedName = doc.splitTextToSize(productLabel, 92);
    const rowHeight = Math.max(10, wrappedName.length * 4.5 + 4);

    if (y + rowHeight > 255) {
      doc.addPage();
      y = 20;
    }

    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y + rowHeight, right, y + rowHeight);

    doc.text(wrappedName, col.item + 2, y + 4);
    doc.text(String(quantity), col.qty, y + 4, { align: "center" });
    doc.text(formatINR(unitPrice), col.price, y + 4, {
      align: "right",
    });
    doc.text(formatINR(amount), col.amount - 3, y + 4, {
      align: "right",
    });

    y += rowHeight;
  });

  y += 10;

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

// Totals
const totalsX = 120;
const totalsRight = right - 2;

const addTotalLine = (label, amount, bold = false) => {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(bold ? 12 : 10);
  doc.setTextColor(55, 55, 55);

  doc.text(label, totalsX, y);
  doc.text(formatINR(amount), totalsRight, y, {
    align: "right",
  });

  y += bold ? 9 : 7;
};

addTotalLine("Items total", itemSubtotal);
addTotalLine("Delivery charge", deliveryCharge);

// Add space before the divider so it doesn't overlap any text.
y += 2;
doc.setDrawColor(210, 210, 210);
doc.line(totalsX, y, right, y);

// Position TOTAL below the divider.
y += 7;
addTotalLine("TOTAL", total, true);

y += 4;
doc.setFont("helvetica", "bold");
doc.setFontSize(10);
doc.text("Payment method", margin, y);

doc.setFont("helvetica", "normal");
doc.text(String(order.paymentMode || "Online"), margin + 35, y);

y += 7;
doc.setFont("helvetica", "bold");
doc.text("Payment status", margin, y);

doc.setFont("helvetica", "normal");
doc.text(paymentStatus, margin + 35, y);

  // Footer
  const footerY = Math.min(
    Math.max(y + 18, 270),
    doc.internal.pageSize.getHeight() - 18
  );

  doc.setDrawColor(225, 225, 225);
  doc.line(margin, footerY - 7, right, footerY - 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text("Thank you for shopping with Prime Shoes!", pageWidth / 2, footerY, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(
    "Please keep this receipt for your records.",
    pageWidth / 2,
    footerY + 5,
    { align: "center" }
  );

  doc.save(`Prime-Shoes-Receipt-${orderNumber}.pdf`);
}
