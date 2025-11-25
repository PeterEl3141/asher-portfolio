import React from "react";
import "./SiteFooter.css";

function Icon({ title, children }) {
  return (
    <span className="footer-icon" role="img" aria-label={title}>
      {children}
    </span>
  );
}

export default function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-container">
        <div className="footer-icons">
          {/* Instagram */}
          <a
            href="https://instagram.com/"
            target="_blank"
            rel="noreferrer"
            className="social-link"
            aria-label="Instagram"
          >
            <Icon title="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zm5.25-.95a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1z" />
              </svg>
            </Icon>
          </a>

          {/* Vimeo */}
          <a
            href="https://vimeo.com/"
            target="_blank"
            rel="noreferrer"
            className="social-link"
            aria-label="Vimeo"
          >
            <Icon title="Vimeo">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.977 6.235c-.105 2.322-1.72 5.51-4.845 9.566-3.23 4.214-5.958 6.321-8.189 6.321-1.381 0-2.552-1.275-3.513-3.828l-1.9-7.018c-.706-2.55-1.46-3.827-2.262-3.827-.176 0-.793.37-1.852 1.11L0 7.5c1.162-1.02 2.3-2.04 3.415-3.06 1.54-1.333 2.692-2.038 3.457-2.116 1.815-.176 2.938 1.066 3.37 3.724.455 2.87.772 4.654.95 5.35.527 2.393 1.104 3.588 1.73 3.588.487 0 1.218-.765 2.195-2.295.976-1.531 1.498-2.697 1.567-3.5.14-1.325-.383-1.988-1.57-1.988-.558 0-1.134.128-1.73.384 1.15-3.774 3.35-5.616 6.601-5.528 2.406.07 3.535 1.668 3.387 4.271z" />
              </svg>
            </Icon>
          </a>

          {/* YouTube */}
          <a
            href="https://youtube.com/"
            target="_blank"
            rel="noreferrer"
            className="social-link"
            aria-label="YouTube"
          >
            <Icon title="YouTube">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.5 7.2a4.6 4.6 0 0 0-3.3-3.3C18.4 3.4 12 3.4 12 3.4s-6.4 0-8.2.5A4.6 4.6 0 0 0 .5 7.2 47.7 47.7 0 0 0 0 12c0 1.6.2 3.2.5 4.8a4.6 4.6 0 0 0 3.3 3.3c1.8.5 8.2.5 8.2.5s6.4 0 8.2-.5a4.6 4.6 0 0 0 3.3-3.3c.3-1.6.5-3.2.5-4.8s-.2-3.2-.5-4.8zM9.8 15.5V8.5l6.2 3.5-6.2 3.5z" />
              </svg>
            </Icon>
          </a>

          {/* Email */}
          <a
            href="mailto:contact@example.com"
            className="social-link"
            aria-label="Email"
          >
            <Icon title="Email">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v.4l-10 6.25L2 6.4V6zm0 3.2V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9.2l-9.4 5.9a2 2 0 0 1-2.2 0L2 9.2z" />
              </svg>
            </Icon>
          </a>
        </div>

        <div className="footer-copy">
          © {new Date().getFullYear()} · Asher Rosen
        </div>
      </div>
    </footer>
  );
}
