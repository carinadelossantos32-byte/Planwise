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

  const navigate = useNavigate();

  const handleOpenModal = () => {
    setShowModal(true);
    setModalMessage('');
    setModalError(false);
    setIsSent(false);
    setResetEmail('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalMessage('');
    setModalError(false);
    setIsSent(false);
    setResetEmail('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    setErrorMessage(''); 

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.email);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const userRole = userData.role; 

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
      } else {
        setErrorMessage("An unexpected network error occurred.");
      }
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setModalMessage('');
    setModalError(false);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setModalError(false);
      setIsSent(true); 
      setModalMessage(`Instructions have been sent to ${resetEmail}. Please check your inbox or spam folder!`);
    } catch (error) {
      console.error("Reset error:", error.code);
      setModalError(true);
      setIsSent(false);
      if (error.code === 'auth/user-not-found') {
        setModalMessage("This email address is not registered in our system.");
      } else {
        setModalMessage("Could not send reset link. Please try again later.");
      }
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
        </div>

      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ position: 'relative' }}>
            <button 
              type="button" 
              className="modal-close-x" 
              onClick={handleCloseModal}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '16px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: '#A0AEC0',
                fontSize: '22px',
                cursor: 'pointer',
                fontWeight: 'bold',
                lineHeight: '1'
              }}
            >
              ✕
            </button>

            <h2 className="modal-title">Reset Password</h2>
            <p className="modal-subtitle">
              {isSent 
                ? "Check your email for the password reset instructions." 
                : "Enter your registered email address below, and we'll send you instructions to reset your password."}
            </p>
            
            <form onSubmit={handleForgotPasswordSubmit}>
              {!isSent && (
                <div className="login-form-group">
                  <input 
                    type="email" 
                    className="login-input modal-input" 
                    placeholder="Registered Email Address" 
                    value={resetEmail} 
                    onChange={(e) => setResetEmail(e.target.value)} 
                    required 
                  />
                </div>
              )}

              {modalMessage && (
                <div className={`modal-status-msg ${modalError ? 'status-error' : 'status-success'}`}>
                  {modalMessage}
                </div>
              )}

              <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                {isSent ? (
                  <button type="button" className="modal-submit-btn" onClick={handleCloseModal} style={{ width: '100%' }}>
                    Got It
                  </button>
                ) : (
                  <>
                    <button type="button" className="modal-cancel-btn" onClick={handleCloseModal}>Cancel</button>
                    <button type="submit" className="modal-submit-btn">Send Link</button>
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