import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="ft">
      <div className="ft-accent-bar" />
      <div className="ft-body">
        <div className="ft-grid">
          <div>
            <div className="ft-brand-name">
              Council<span>Connect</span>
            </div>
            <p className="ft-brand-tagline">
              AI-Augmented Campus Governance & Operations Ecosystem. Digitizing verified student
              governance, communication, events, grievances, and campus operations at GECA.
            </p>
            <div className="ft-contact-pills">
              <Link to="/contact" className="ft-cpill"><i className="fas fa-envelope" /> councilconnect@geca.ac.in</Link>
              <Link to="/" className="ft-cpill"><i className="fas fa-globe" /> councilconnect.app</Link>
            </div>
          </div>
          <div>
            <div className="ft-col-title">Governance</div>
            <ul className="ft-link-list">
              <li><Link to="/council">Council Directory</Link></li>
              <li><Link to="/events">Events</Link></li>
              <li><Link to="/grievances">Grievances</Link></li>
              <li><Link to="/lost-found">Lost & Found</Link></li>
            </ul>
          </div>
          <div>
            <div className="ft-col-title">Campus</div>
            <ul className="ft-link-list">
              <li><Link to="/campus-map">Campus Map</Link></li>
              <li><Link to="/messages">Messages</Link></li>
              <li><Link to="/profile">My Profile</Link></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </div>
          <div>
            <div className="ft-col-title">Location</div>
            <div className="ft-addr-block">
              <div className="ft-addr-line">
                <i className="fas fa-map-marker-alt" />
                <div>
                  <strong>Government College of Engineering</strong>
                  Station Road, Osmanpura
                  <br />
                  Chhatrapati Sambhajinagar — 431005
                  <br />
                  Maharashtra, India
                </div>
              </div>
              <div className="ft-addr-line">
                <i className="fas fa-clock" />
                <div>Mon – Fri : 10:30 AM – 5:00 PM</div>
              </div>
            </div>
          </div>
        </div>
        <div className="ft-bottom">
          <div className="ft-bottom-line">
            © {new Date().getFullYear()} Government College of Engineering, Chhatrapati Sambhajinagar. All rights reserved.
          </div>
          <div className="ft-bottom-line">CouncilConnect · Final Year Project</div>
        </div>
      </div>
    </footer>
  );
}
