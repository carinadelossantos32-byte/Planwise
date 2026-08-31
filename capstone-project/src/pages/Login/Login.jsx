import React, { useState } from 'react';
import { useNavigate } from 'react-router'; 
import './Login.css'; 
import logoImg from '../../assets/malolos-logo.png'; 
import { auth, db, signInWithEmailAndPassword, doc, getDoc, sendPasswordResetEmail } from '../../firebase-config';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [resetEmail, setResetEmail] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState(false);
  const [isSent, setIsSent] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleOpenModal = () => {
    setShowModal(true);
    setModalMessage('');
    setModalError(false);
    setIsSent(false);
    setResetEmail('');
    setIsSubmitting(false);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalMessage('');
    setModalError(false);
    setIsSent(false);
    setResetEmail('');
    setIsSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setErrorMessage(''); 

    const cleanEmail = email.trim().toLowerCase();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.email);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userRole = userData.role; 

        localStorage.setItem('userRole', userRole);

        if (userRole === 'cpd') {
          navigate('/dashboard/cpd', { replace: true }); 
        } else if (userRole === 'health') {
          navigate('/dashboard/health', { replace: true });
        } else {
          setErrorMessage("Account role not recognized. Please contact system admin.");
        }
      } else {
        setErrorMessage("User profile data not found in system directory.");
      }
      
    } catch (error) {
      console.error("Auth error:", error.code);
      if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password'
      ) {
        setErrorMessage("Incorrect email address or password. Please try again.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("Please enter a valid email address format.");
      } else if (error.code === 'auth/too-many-requests') {
        setErrorMessage("Too many failed attempts. Please try again later.");
      } else {
        setErrorMessage("An unexpected network error occurred.");
      }
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setModalMessage('');
    setModalError(false);

    const cleanResetEmail = resetEmail.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanResetEmail)) {
      setModalError(true);
      setModalMessage("Please enter a valid email address format.");
      return;
    }

    setIsSubmitting(true);

    try {
      const userDocRef = doc(db, "users", cleanResetEmail);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        setModalError(true);
        setIsSent(false);
        setModalMessage("This email address is not registered in our system.");
        setIsSubmitting(false);
        return;
      }

      await sendPasswordResetEmail(auth, cleanResetEmail);
      setModalError(false);
      setIsSent(true); 
      setModalMessage(`Instructions have been sent to ${cleanResetEmail}. Please check your inbox or spam folder.`);
    } catch (error) {
      console.error("Reset error:", error.code);
      setModalError(true);
      setIsSent(false);
      if (error.code === 'auth/user-not-found') {
        setModalMessage("This email address is not registered in our system.");
      } else if (error.code === 'auth/invalid-email') {
        setModalMessage("Invalid email address format.");
      } else if (error.code === 'auth/too-many-requests') {
        setModalMessage("Too many requests sent. Please try again later.");
      } else {
        setModalMessage("Could not send reset link. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-wrapper">
        
        <div className="login-left">
          <h1 className="login-title">Sign In</h1>
          <p className="login-subtitle">Please enter your credentials to access the system dashboard.</p>
          <form onSubmit={handleSubmit}>
            <div className="login-form-group">
              <input type="email" className="login-input" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="login-form-group">
              <input type="password" className="login-input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {errorMessage && <div className="login-error">{errorMessage}</div>}
            <button type="submit" className="login-btn">Log In</button>
          </form>
          
          <button type="button" className="login-forgot" onClick={handleOpenModal}>
            Forgot Password?
          </button>
        </div>
        
        <div className="login-right">
          <img src={logoImg} alt="PlanWise Logo" className="login-logo" />
          <h2 className="login-brand-name">Plan<span>Wise</span></h2>
          <h3 className="login-brand-city">MALOLOS</h3>
          <p className="login-brand-description">Commission on Population Development</p>
        </div>

      </div>

      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(3, 10, 66, 0.65)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            boxSizing: 'border-box'
          }}
        >
          <div 
            style={{
              position: 'relative',
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              width: '100%',
              maxWidth: '440px',
              padding: '34px 28px',
              borderRadius: '24px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.35)',
              border: '1px solid #E2E8F0',
              boxSizing: 'border-box'
            }}
          >
            <button 
              type="button" 
              onClick={handleCloseModal}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: '#F1F5F9',
                border: 'none',
                color: '#64748B',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <h2 style={{ color: '#091F7A', fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', textAlign: 'left', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              Reset Password
            </h2>
            <p style={{ color: '#64748B', fontSize: '13.5px', lineHeight: 1.5, margin: '0 0 22px 0', textAlign: 'left', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              {isSent 
                ? "Check your email for the password reset instructions." 
                : "Enter your registered email address below, and we'll send you instructions to reset your password."}
            </p>
            
            <form onSubmit={handleForgotPasswordSubmit} noValidate>
              {!isSent && (
                <div style={{ marginBottom: '14px' }}>
                  <input 
                    type="email" 
                    placeholder="Registered Email Address" 
                    value={resetEmail} 
                    onChange={(e) => {
                      setResetEmail(e.target.value);
                      setModalMessage('');
                      setModalError(false);
                    }} 
                    required 
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: modalError ? '#FEF2F2' : '#F8FAFC',
                      border: modalError ? '1.5px solid #EF4444' : '1.5px solid #CBD5E1',
                      borderRadius: '50px',
                      color: '#0F172A',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: "'Segoe UI', system-ui, sans-serif"
                    }}
                  />
                </div>
              )}

              {modalMessage && (
                <div 
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    padding: '12px 16px',
                    borderRadius: '12px',
                    marginTop: '14px',
                    textAlign: 'left',
                    lineHeight: 1.45,
                    backgroundColor: modalError ? '#FEF2F2' : '#F0FDF4',
                    color: modalError ? '#991B1B' : '#166534',
                    border: modalError ? '1px solid #FCA5A5' : '1px solid #86EFAC',
                    fontFamily: "'Segoe UI', system-ui, sans-serif"
                  }}
                >
                  {modalMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                {isSent ? (
                  <button 
                    type="button" 
                    onClick={handleCloseModal}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: '#F7B500',
                      border: 'none',
                      borderRadius: '50px',
                      color: '#030A42',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'Segoe UI', system-ui, sans-serif"
                    }}
                  >
                    Got It
                  </button>
                ) : (
                  <>
                    <button 
                      type="button" 
                      onClick={handleCloseModal}
                      disabled={isSubmitting}
                      style={{
                        padding: '11px 22px',
                        background: '#FFFFFF',
                        border: '1.5px solid #CBD5E1',
                        borderRadius: '50px',
                        color: '#475569',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        fontFamily: "'Segoe UI', system-ui, sans-serif"
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      style={{
                        padding: '11px 26px',
                        backgroundColor: '#F7B500',
                        border: 'none',
                        borderRadius: '50px',
                        color: '#030A42',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        opacity: isSubmitting ? 0.7 : 1,
                        fontFamily: "'Segoe UI', system-ui, sans-serif"
                      }}
                    >
                      {isSubmitting ? "Checking..." : "Send Link"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;