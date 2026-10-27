import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Discountsection = () => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 10);

  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function getTimeLeft(toDate) {
    const now = new Date();
    const difference = toDate - now;

    let time = {
      days: '00',
      hours: '00',
      minutes: '00',
      seconds: '00',
    };

    if (difference > 0) {
      time = {
        days: String(Math.floor(difference / (1000 * 60 * 60 * 24))).padStart(2, '0'),
        hours: String(Math.floor((difference / (1000 * 60 * 60)) % 24)).padStart(2, '0'),
        minutes: String(Math.floor((difference / 1000 / 60) % 60)).padStart(2, '0'),
        seconds: String(Math.floor((difference / 1000) % 60)).padStart(2, '0'),
      };
    }

    return time;
  }

  return (
    <section className="discount py-5">
      <div className="container">
        <div className="row align-items-center">
          {/* Left Side Image */}
          <div className="col-lg-6 mb-4 mb-lg-0">
            <div className="discount__pic rounded overflow-hidden">
              <img
                src="img/discountsection1.jpg"
                alt="Discount"
                className="img-fluid w-100"
              />
            </div>
          </div>

          {/* Right Side Content */}
          <div className="col-lg-6">
            <div className="discount__text ps-lg-4">
              <div className="discount__text__title mb-3">
                <span className="text-danger fw-semibold">Discount</span>
                <h2 className="mb-2">Summer 2025</h2>
                <h5>
                  <span className="text-primary fw-bold">Sale</span> 50%
                </h5>
              </div>

              <div className="discount__countdown d-flex gap-3 mb-4">
                {['Days', 'Hour', 'Min', 'Sec'].map((label, idx) => {
                  const value = [timeLeft.days, timeLeft.hours, timeLeft.minutes, timeLeft.seconds][idx];
                  return (
                    <div className="countdown__item text-center" key={label}>
                      <span className="fs-3 fw-bold d-block">{value}</span>
                      <p className="mb-0">{label}</p>
                    </div>
                  );
                })}
              </div>

              <Link
                to="/products?label=sale"
                className="btn btn-danger px-4 py-2"
              >
                Shop now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Discountsection;