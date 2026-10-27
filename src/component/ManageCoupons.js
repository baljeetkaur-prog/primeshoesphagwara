import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

import Admintopnav from './Admintopnav';
import Adminsidebar from './Adminsidebar';
import { AdminContext } from './AdminContext';

import "./ManageCoupons.css";

const ManageCoupons = () => {

  const API = process.env.REACT_APP_APIURL;

  const [coupons, setCoupons] = useState([]);

  const [form, setForm] = useState({
    code: '',
    discountType: 'percent',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    totalUsageLimit: '',
    usageLimitPerUser: 1,
    expiryDate: ''
  });

  const fetchCoupons = async () => {

    try {

      const res = await axios.get(
        `${API}/api/admin/coupons`
      );

      setCoupons(res.data);

    } catch {

      toast.error('Failed to load coupons');

    }

  };

  useEffect(() => {

    fetchCoupons();

  }, []);

  const handleSubmit = async (e) => {

    e.preventDefault();

    try {

      await axios.post(
        `${API}/api/admin/coupons`,
        form
      );

      toast.success('Coupon Created');

      setForm({
        code: '',
        discountType: 'percent',
        discountValue: '',
        minOrderAmount: '',
        maxDiscount: '',
        totalUsageLimit: '',
        usageLimitPerUser: 1,
        expiryDate: ''
      });

      fetchCoupons();

    } catch (err) {

      toast.error(
        err.response?.data?.message
      );

    }

  };

  const deleteCoupon = async (id) => {

    if (!window.confirm('Delete coupon?')) return;

    try {

      await axios.delete(
        `${API}/api/admin/coupons/${id}`
      );

      toast.success('Deleted');

      fetchCoupons();

    } catch {

      toast.error('Failed');

    }

  };
  const { adminName, handleLogout } =
  useContext(AdminContext);

return (
  <div className="admin-layout">

    <Admintopnav
      adminName={adminName}
      handleLogout={handleLogout}
    />

    <div className="formadmin-container">

      <Adminsidebar />

      <div className="formadmin-main">

        <div className="coupon-container">

          <div className="coupon-form-card">

            <h3>Create Coupon</h3>

        <form
  onSubmit={handleSubmit}
  className="coupon-form"
>

  <label>Coupon Code</label>
  <input
    placeholder="e.g. SAVE10"
    value={form.code}
    onChange={(e) =>
      setForm({
        ...form,
        code: e.target.value.toUpperCase()
      })
    }
    required
  />

  <label>Discount Type</label>
  <select
    value={form.discountType}
    onChange={(e) =>
      setForm({
        ...form,
        discountType: e.target.value
      })
    }
  >
    <option value="percent">
      Percentage (%)
    </option>

    <option value="fixed">
      Fixed Amount (₹)
    </option>
  </select>

  <label>
    {form.discountType === "percent"
      ? "Discount Percentage"
      : "Discount Amount"}
  </label>

  <input
    type="number"
    placeholder={
      form.discountType === "percent"
        ? "e.g. 10"
        : "e.g. 500"
    }
    value={form.discountValue}
    onChange={(e) =>
      setForm({
        ...form,
        discountValue: e.target.value
      })
    }
    required
  />

  <label>Minimum Order Amount (₹)</label>
  <input
    type="number"
    placeholder="e.g. 2000"
    value={form.minOrderAmount}
    onChange={(e) =>
      setForm({
        ...form,
        minOrderAmount: e.target.value
      })
    }
  />

  <label>Maximum Discount (₹)</label>
  <input
    type="number"
    placeholder="e.g. 1000"
    value={form.maxDiscount}
    onChange={(e) =>
      setForm({
        ...form,
        maxDiscount: e.target.value
      })
    }
  />

  <label>Total Usage Limit</label>
  <input
    type="number"
    placeholder="e.g. 100"
    value={form.totalUsageLimit}
    onChange={(e) =>
      setForm({
        ...form,
        totalUsageLimit: e.target.value
      })
    }
  />

  <label>Usage Limit Per User</label>
  <input
    type="number"
    placeholder="e.g. 1"
    value={form.usageLimitPerUser}
    onChange={(e) =>
      setForm({
        ...form,
        usageLimitPerUser: e.target.value
      })
    }
  />

  <label>Expiry Date</label>
  <input
    type="date"
    value={form.expiryDate}
    onChange={(e) =>
      setForm({
        ...form,
        expiryDate: e.target.value
      })
    }
  />

  <button
    type="submit"
    className="site-btn"
  >
    Create Coupon
  </button>

</form>

          </div>

          <div className="coupon-list-card">

            <h3>All Coupons</h3>

            <div className="table-responsive">

              <table className="coupon-table">

                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Used</th>
                    <th>Limit</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {coupons.map((coupon)=>(
                    <tr key={coupon._id}>

                      <td>{coupon.code}</td>

                      <td>
                        {coupon.discountType === "percent"
                          ? `${coupon.discountValue}%`
                          : `₹${coupon.discountValue}`
                        }
                      </td>

                      <td>{coupon.usedCount}</td>

                      <td>{coupon.totalUsageLimit}</td>

                      <td>
                        <span
                          className={
                            coupon.active
                              ? "status-active"
                              : "status-inactive"
                          }
                        >
                          {coupon.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        <button
                          className="delete-btn"
                          onClick={()=>
                            deleteCoupon(coupon._id)
                          }
                        >
                          Delete
                        </button>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>

          </div>

        </div>

      </div>

    </div>

  </div>
);
};

export default ManageCoupons;