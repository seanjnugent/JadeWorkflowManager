import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/users/user/refresh`, { refresh_token: refreshToken });
        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('userId');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState({ message: "", type: "" });
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError({ message: "", type: "" });
    setRemainingAttempts(null);
    setLockedUntil(null);

    try {
      const response = await api.post('/users/user/authenticate', {
        email_address: email,
        password
      });

      const { access_token, refresh_token, user_id } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('userId', user_id);
      navigate('/home');
    } catch (err) {
      console.error('Login error:', err);

      if (err.response?.data?.detail) {
        const errorDetail = err.response.data.detail;

        if (errorDetail.error_code === "account_locked") {
          setError({
            message: "Your account is locked. Please try again later.",
            type: "locked"
          });
          setLockedUntil(errorDetail.lockedUntil);
        } else if (errorDetail.error_code === "invalid_credentials") {
          setError({
            message: "Invalid email or password",
            type: "credentials"
          });
          if (errorDetail.remainingAttempts !== null) {
            setRemainingAttempts(errorDetail.remainingAttempts);
          }
        } else {
          setError({
            message: errorDetail.message || "An unexpected error occurred",
            type: "generic"
          });
        }
      } else {
        setError({
          message: err.message || "An unexpected error occurred",
          type: "generic"
        });
      }

      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden flex">
      {/* Left Side */}
      <div className="hidden lg:block w-1/2 relative overflow-hidden">
        <motion.div
          className="absolute -inset-[25%]"
          style={{
            background: `linear-gradient(
              -45deg,
              #1e3c72, #2a5298, #3a6073,
              #16222a,rgb(11, 151, 156), #1e3c72
            )`,
            backgroundSize: '400% 400%'
          }}
          animate={{
            backgroundPosition: [
              '0% 50%',
              '100% 50%',
              '0% 50%'
            ]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute -inset-[15%]"
          style={{
            background: `radial-gradient(
              circle at 30% 30%,
              rgba(30, 60, 114, 0.7),
              rgba(58, 96, 115, 0.5),
              transparent 50%
            )`,
            backdropFilter: 'blur(50px)',
            opacity: 0.8
          }}
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <div className="relative h-full flex items-center justify-center p-12 z-10">
          <div className="max-w-md space-y-6 text-white">
            <h1 className="text-7xl font-bold">Pierre</h1>
            <p className="text-xl text-white/80">
              Data Workflow Manager
            </p>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse" />
              <span className="text-white/70 text-sm">Execute pipelines and process data in the cloud</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 w-full lg:w-1/2">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-[50px] w-[337px] h-20 w-auto">
              <svg className="block size-full" fill="none" preserveAspectRatio="xMidY meet" viewBox="0 0 471 70">
                <g clipPath="url(#clip0_2_27)">
                  <path d="M0 0H106.642V65.8958H0V0Z" fill="white"></path>
                  <path d="M14.8113 2.96417L53.0929 25.5375L91.3745 2.96417H14.8113ZM14.8113 62.7036L53.0929 40.3583L91.3745 62.7036H14.8113ZM2.96226 9.80456V56.0912L41.016 33.0619L2.96226 9.80456ZM103.679 9.80456V56.0912L65.6255 33.0619L103.679 9.80456Z" fill="#0065BD"></path>
                  <path d="M461.885 59.5114C458.695 59.5114 456.644 57.0033 456.644 53.355C456.644 49.7068 458.695 47.1987 461.885 47.1987C463.708 47.1987 465.759 48.3388 466.671 49.7068V57.0033C465.759 58.3713 463.708 59.5114 461.885 59.5114ZM470.544 62.4756V44.0065H466.443V46.5147C465.759 45.5876 464.866 44.8358 463.836 44.3206C462.806 43.8054 461.669 43.5415 460.518 43.5505C455.733 43.5505 452.315 47.1987 452.315 53.127C452.315 59.2834 455.733 62.7036 460.518 62.7036C463.025 62.7036 465.075 61.5635 466.443 59.7394V62.2476H470.544V62.4756ZM435.681 62.4756V59.9674C437.048 61.7915 439.327 62.9316 441.605 62.9316C446.39 62.9316 449.808 59.2834 449.808 53.355C449.808 47.4267 446.39 43.7785 441.605 43.7785C439.327 43.7785 437.276 44.9186 435.681 46.7427V37.1661H431.579V62.7036H435.681V62.4756ZM435.681 57.0033V49.7068C436.592 48.3388 438.643 47.1987 440.466 47.1987C443.656 47.1987 445.707 49.7068 445.707 53.355C445.707 57.0033 443.656 59.5114 440.466 59.5114C438.415 59.5114 436.592 58.3713 435.681 57.0033M425.427 62.9316C427.25 62.9316 428.389 62.4756 429.3 61.7915L428.389 58.8274C428.161 59.2834 427.25 59.5114 426.566 59.5114C425.427 59.5114 424.743 58.5993 424.743 57.2313V37.1661H420.642V58.3713C420.642 61.3355 422.464 62.9316 425.427 62.9316M410.388 53.5831H401.273L405.83 41.4984L410.388 53.5831ZM418.591 62.4756L408.565 36.9381H403.096L393.07 62.4756H398.083L399.906 57.4593H411.527L413.35 62.4756H418.591ZM391.475 51.5309H382.36V54.9511H391.475V51.5309ZM378.486 62.4756V49.4788C378.486 45.6026 376.435 43.5505 372.562 43.5505C369.599 43.5505 367.321 45.1466 366.181 46.5147V36.9381H362.08V62.4756H366.181V49.4788C367.093 48.3388 368.916 46.9707 370.967 46.9707C373.245 46.9707 374.612 47.8827 374.612 50.6189V62.2476H378.486V62.4756ZM338.61 59.5114C335.419 59.5114 333.369 57.0033 333.369 53.355C333.369 49.7068 335.419 47.1987 338.61 47.1987C340.433 47.1987 342.483 48.3388 343.395 49.7068V57.0033C342.483 58.3713 340.433 59.5114 338.61 59.5114M347.268 62.4756V44.0065H343.167V46.5147C342.483 45.5876 341.59 44.8358 340.56 44.3206C339.531 43.8054 338.394 43.5415 337.242 43.5505C332.457 43.5505 329.039 47.1987 329.039 53.127C329.039 59.2834 332.457 62.7036 337.242 62.7036C339.749 62.7036 341.8 61.5635 343.167 59.7394V62.2476H347.268V62.4756ZM325.621 62.4756V49.4788C325.621 45.6026 323.57 43.5505 319.697 43.5505C316.734 43.5505 314.456 45.1466 313.089 46.5147V44.0065H308.987V62.4756H313.089V49.4788C314 48.3388 315.823 46.9707 317.874 46.9707C320.152 46.9707 321.52 47.8827 321.52 50.8469V62.2476H325.621V62.4756ZM288.023 62.9316C293.036 62.9316 295.771 60.4235 295.771 57.2313C295.771 49.9349 284.605 52.443 284.605 49.0228C284.605 47.6547 285.972 46.7427 288.023 46.7427C290.302 46.7427 292.353 47.6547 293.492 49.0228L295.087 46.2866C293.101 44.6442 290.6 43.7559 288.023 43.7785C283.466 43.7785 280.731 10.0326 280.731 10.0326C275.087 10.0326 271.441 14.3648 271.441 19.6091C271.378 20.8641 271.575 22.1186 272.019 23.294C272.463 24.4693 273.145 25.5401 274.022 26.4393C274.899 27.3385 275.953 28.0466 277.116 28.5192C278.28 28.9918 279.528 29.2187 280.784 29.1857ZM267.971 59.5114C264.781 59.5114 262.73 57.0033 262.73 53.355C262.73 49.7068 264.781 47.1987 267.971 47.1987C269.794 47.1987 271.845 48.3388 272.756 49.7068V57.0033C271.845 58.3713 269.794 59.5114 267.971 59.5114ZM276.63 62.4756V44.0065H272.528V46.5147C271.845 45.5876 270.952 44.8358 269.922 44.3206C268.892 43.8054 267.755 43.5415 266.604 43.5505C261.819 43.5505 258.401 47.1987 258.401 53.127C258.401 59.2834 261.819 62.7036 266.604 62.7036C269.11 62.7036 271.161 61.5635 272.528 59.7394V62.2476H276.63V62.4756ZM253.843 62.9316C255.666 62.9316 256.806 62.4756 257.489 61.7915L256.578 58.8274C256.35 59.2834 255.666 59.5114 254.755 59.5114C253.615 59.5114 252.932 58.5993 252.932 57.2313V47.6547H256.578V44.2345H252.932V39.2182H248.83V44.2345H246.096V47.6547H249.058V58.3713C249.058 61.3355 250.653 62.9316 253.843 62.9316M242.906 62.9316C244.729 62.9316 245.868 62.4756 246.779 61.7915L245.868 58.8274C245.64 59.2834 244.729 59.5114 244.045 59.5114C242.906 59.5114 242.222 58.5993 242.222 57.2313V37.1661H238.12V58.3713C238.12 61.3355 239.716 62.9316 242.906 62.9316ZM224.676 59.5114C221.486 59.5114 219.435 57.0033 219.435 53.355C219.435 49.7068 221.486 47.1987 224.676 47.1987C226.499 47.1987 228.55 48.3388 229.462 49.7068V57.0033C228.876 57.7247 228.15 58.3191 227.327 58.7504C226.504 59.1816 225.602 59.4405 224.676 59.5114M233.335 62.4756V44.0065H229.234V46.5147C228.55 45.5876 227.657 44.8358 226.627 44.3206C225.597 43.8054 224.46 43.5415 223.309 43.5505C218.524 43.5505 215.106 47.1987 215.106 53.127C215.106 59.2834 218.524 62.7036 223.309 62.7036C225.816 62.7036 227.866 61.5635 229.234 59.7394V62.2476H233.335V62.4756ZM211.46 62.4756V49.4788C211.46 45.6026 209.409 43.5505 205.536 43.5505C202.573 43.5505 200.295 45.1466 199.155 46.5147V36.9381H195.054V62.4756H199.155V49.4788C200.067 48.3388 201.89 46.9707 203.94 46.9707C206.219 46.9707 207.586 47.8827 207.586 50.6189V62.2476H211.46V62.4756ZM181.61 59.0554C178.419 59.0554 176.369 56.7752 176.369 53.127C176.369 49.4788 178.419 47.1987 181.61 47.1987C183.433 47.1987 185.483 48.3388 186.395 49.7068V56.5472C185.809 57.2686 185.083 57.8631 184.26 58.2943C183.438 58.7256 182.536 58.9845 181.61 59.0554M180.698 70C185.255 70 190.041 68.1759 190.041 61.5635V44.0065H185.939V46.5147C185.255 45.5876 184.362 44.8358 183.333 44.3206C182.303 43.8054 181.166 43.5415 180.015 43.5505C175.229 43.5505 171.811 46.9707 171.811 52.899C171.811 59.0554 175.229 62.2476 180.015 62.2476C181.193 62.2719 182.358 61.9907 183.396 61.4314C184.435 60.872 185.31 60.0535 185.939 59.0554V61.5635C185.939 65.4397 183.205 66.8078 180.47 66.8078C177.964 66.8078 176.141 66.1238 174.546 64.5277L172.723 67.4919C175.229 69.316 177.736 70 180.698 70ZM159.734 59.5114C156.544 59.5114 154.493 57.0033 154.493 53.355C154.493 49.7068 156.544 47.1987 159.734 47.1987C161.557 47.1987 163.608 48.3388 164.52 49.7068V57.0033C163.608 58.3713 161.557 59.5114 159.734 59.5114ZM168.393 62.4756V44.0065H164.292V46.5147C163.608 45.5876 162.715 44.8358 161.685 44.3206C160.655 43.8054 159.518 43.5415 158.367 43.5505C153.582 43.5505 150.164 47.1987 150.164 53.127C150.164 59.2834 153.582 62.7036 158.367 62.7036C160.874 62.7036 162.925 61.5635 164.292 59.7394V62.2476H168.393V62.4756ZM146.746 44.0065H142.644V62.4756H146.746V44.0065ZM144.695 41.7264C146.062 41.7264 147.202 40.5863 147.202 39.2182C147.202 37.8502 146.062 36.7101 144.695 36.7101C143.328 36.7101 142.189 37.8502 142.189 39.2182C142.189 40.8143 143.328 41.7264 144.695 41.7264ZM129.884 49.0228H123.731V41.0423H129.884C132.39 41.0423 134.213 42.6384 134.213 45.1466C134.213 47.4267 132.39 49.0228 129.884 49.0228ZM138.999 62.4756L132.618 52.443C135.808 51.987 138.771 49.4788 138.771 44.9186C138.771 40.1303 135.353 36.9381 130.34 36.9381H119.174V62.4756H123.731V52.899H128.289L133.985 62.4756H138.999Z" fill="#858B91"></path>
                  <path d="M467.354 29.1857C469.177 29.1857 470.316 28.7296 471 28.0456L470.089 25.0814C469.861 25.5375 469.177 25.7655 468.266 25.7655C467.126 25.7655 466.443 24.8534 466.443 23.4853V13.9088H470.089V10.4886H466.443V5.2443H462.569V10.2606H459.607V13.6808H462.569V24.3974C462.569 27.5896 464.164 29.1857 467.354 29.1857M456.644 28.7296V15.7329C456.644 11.8567 454.594 9.80456 450.72 9.80456C447.758 9.80456 445.479 11.4006 444.112 12.7687V10.4886H440.01V28.9577H444.112V15.9609C445.023 14.8208 446.846 13.4528 448.897 13.4528C451.176 13.4528 452.543 14.3648 452.543 17.329V28.9577H456.644V28.7296ZM432.718 18.013H422.464C422.692 15.7329 424.287 13.2248 427.705 13.2248C431.123 13.2248 432.491 15.9609 432.718 18.013M427.705 29.1857C430.668 29.1857 433.402 28.2736 435.225 26.4495L433.402 23.7134C432.035 25.0814 429.984 25.7655 428.161 25.7655C424.743 25.7655 422.692 23.4853 422.237 20.7492H436.364V19.8371C436.364 14.1368 432.946 9.80456 427.25 9.80456C425.994 9.77155 424.746 9.99846 423.582 10.4711C422.419 10.9437 421.365 11.6517 420.488 12.5509C419.611 13.4501 418.929 14.5209 418.485 15.6963C418.041 16.8716 417.844 18.1261 417.907 19.3811C418.135 25.3094 422.237 29.1857 427.705 29.1857M414.261 28.7296V15.5049C414.261 11.8567 412.21 10.0326 409.02 10.0326C406.286 10.0326 403.779 11.8567 402.868 13.4528C402.184 11.4007 400.589 10.0326 397.855 10.0326C395.121 10.0326 392.614 11.8567 391.93 12.9967V10.4886H387.829V28.9577H391.93V15.9609C392.842 14.8208 394.437 13.4528 396.26 13.4528C398.538 13.4528 399.222 14.8208 399.222 16.873V28.9577H403.324V15.9609C404.235 14.8208 405.83 13.4528 407.653 13.4528C409.932 13.4528 410.615 14.8208 410.615 16.873V28.9577H414.261V28.7296ZM382.588 28.7296V15.7329C382.588 11.8567 380.537 9.80456 376.663 9.80456C373.701 9.80456 371.422 11.4006 370.055 12.7687V10.4886H365.954V28.9577H370.055V15.9609C370.967 14.8208 372.79 13.4528 374.84 13.4528C377.119 13.4528 378.486 14.3648 378.486 17.329V28.9577H382.588V28.7296ZM357.295 28.7296V16.1889C358.206 14.8208 360.257 13.6808 362.08 13.6808H363.219V10.0326C360.941 10.0326 358.662 11.4007 357.295 13.2248V10.4886H353.193V28.9577H357.295V28.7296ZM345.673 18.013H335.419C335.647 15.7329 337.242 13.2248 340.66 13.2248C344.078 13.2248 345.446 15.9609 345.673 18.013M340.66 29.1857C343.623 29.1857 346.357 28.2736 348.18 26.4495L346.357 23.7134C344.99 25.0814 342.939 25.7655 341.116 25.7655C337.698 25.7655 335.647 23.4853 335.192 20.7492H349.319V19.8371C349.319 14.1368 345.901 9.80456 340.205 9.80456C338.949 9.77155 337.701 9.99846 336.537 10.4711C335.374 10.9437 334.32 11.6517 333.443 12.5509C332.566 13.4501 331.884 14.5209 331.44 15.6963C330.996 16.8716 330.799 18.1261 330.862 19.3811C331.09 25.3094 335.192 29.1857 340.66 29.1857ZM322.887 28.7296L330.406 10.2606H326.077L320.608 24.1694L315.139 10.2606H310.81L318.329 28.7296H322.887ZM300.784 25.7655C297.366 25.7655 295.543 22.8013 295.543 19.6091C295.543 16.4169 297.366 13.4528 300.784 13.4528C304.202 13.4528 306.025 16.4169 306.025 19.6091C306.025 22.8013 304.202 25.7655 300.784 25.7655ZM300.784 29.1857C306.708 29.1857 310.126 24.8534 310.126 19.6091C310.126 14.3648 306.48 10.0326 300.784 10.0326C295.087 10.0326 291.441 14.3648 291.441 19.6091C291.378 20.8641 291.575 22.1186 292.019 23.294C292.463 24.4693 293.145 25.5401 294.022 26.4393C294.899 27.3385 295.953 28.0466 297.116 28.5192C298.28 28.9918 299.528 29.2187 300.784 29.1857ZM276.402 29.1857C284.377 29.1857 289.163 23.7134 289.163 15.0489H275.263V18.9251H284.377C284.099 20.6966 283.179 22.3035 281.792 23.439C280.405 24.5746 278.648 25.1592 276.858 25.0814C271.845 25.0814 268.199 21.2052 268.199 15.9609C268.199 10.4886 271.845 6.84039 276.858 6.84039C279.592 6.84039 282.099 8.43648 283.466 10.2606L287.112 8.20847C285.989 6.53401 284.459 5.17366 282.664 4.25602C280.87 3.33837 278.872 2.89374 276.858 2.96417C275.095 2.90194 273.338 3.19972 271.693 3.83936C270.049 4.47899 268.553 5.44707 267.295 6.68454C266.037 7.92201 265.044 9.40294 264.376 11.037C263.709 12.6711 263.382 14.424 263.414 16.1889C263.414 24.1694 269.566 29.1857 276.402 29.1857ZM250.197 28.7296V15.7329C250.197 11.8567 248.147 9.80456 244.273 9.80456C241.311 9.80456 239.032 11.4006 237.893 12.7687V3.4202H233.791V28.9577H237.893V15.9609C238.804 14.8208 240.627 13.4528 242.678 13.4528C244.956 13.4528 246.324 14.3648 246.324 17.101V28.7296H250.197V28.7296ZM222.398 29.1857C227.411 29.1857 230.145 26.6775 230.145 23.4853C230.145 16.1889 218.98 18.6971 218.98 15.2769C218.98 13.9088 220.347 12.9967 222.398 12.9967C224.676 12.9967 226.727 13.9088 227.866 15.2769L229.462 12.5407C227.476 10.8983 224.974 10.01 222.398 10.0326C217.84 10.0326 215.106 12.5407 215.106 15.5049C215.106 22.5733 226.271 20.0651 226.271 23.7134C226.271 25.0814 224.904 26.2215 222.626 26.2215C220.332 26.1897 218.136 25.2941 216.473 23.7134L214.65 26.6775C216.473 28.2736 219.208 29.1857 222.398 29.1857M211.004 10.4886H206.903V28.9577H211.004V10.4886V10.4886ZM208.954 8.20847C210.321 8.20847 211.46 7.0684 211.46 5.70033C211.46 4.33225 210.321 3.19218 208.954 3.19218C207.586 3.19218 206.447 4.33225 206.447 5.70033C206.447 7.0684 207.586 8.20847 208.954 8.20847ZM200.523 29.1857C202.345 29.1857 203.485 28.7296 204.168 28.0456L203.257 25.0814C203.029 25.5375 202.345 25.7655 201.434 25.7655C200.295 25.7655 199.611 24.8534 199.611 23.4853V13.9088H203.257V10.4886H199.611V5.2443H195.509V10.2606H192.547V13.6808H195.509V24.3974C195.737 27.5896 197.332 29.1857 200.523 29.1857M187.762 29.1857C189.585 29.1857 190.724 28.7296 191.408 28.0456L190.496 25.0814C190.269 25.5375 189.585 25.7655 188.673 25.7655C187.534 25.7655 186.851 24.8534 186.851 23.4853V13.9088H190.496V10.4886H186.851V5.2443H182.749V10.2606H179.787V13.6808H182.749V24.3974C182.977 27.5896 184.572 29.1857 187.762 29.1857ZM168.849 25.7655C165.431 25.7655 163.608 22.8013 163.608 19.6091C163.608 16.4169 165.431 13.4528 168.849 13.4528C172.267 13.4528 174.09 16.4169 174.09 19.6091C174.09 22.8013 172.267 25.7655 168.849 25.7655M168.849 29.1857C174.774 29.1857 178.192 24.8534 178.192 19.6091C178.192 14.3648 174.546 10.0326 168.849 10.0326C162.925 10.0326 159.507 14.3648 159.507 19.6091C159.443 20.8641 159.64 22.1186 160.084 23.294C160.528 24.4693 161.21 25.5401 162.087 26.4393C162.965 27.3385 164.018 28.0466 165.182 28.5192C166.345 28.9918 167.594 29.2187 168.849 29.1857M150.392 29.1857C154.038 29.1857 156.089 27.5896 157.456 25.9935L154.949 23.4853C153.81 24.8534 152.443 25.7655 150.62 25.7655C147.202 25.7655 145.151 23.2573 145.151 19.6091C145.151 15.9609 147.43 13.4528 150.62 13.4528C152.443 13.4528 153.81 14.1368 154.949 15.5049L157.684 12.9967C156.316 11.4007 154.038 10.0326 150.392 10.0326C149.127 10.0013 147.868 10.2276 146.693 10.6978C145.518 11.168 144.45 11.8723 143.555 12.7678C142.66 13.6634 141.956 14.7316 141.486 15.9077C141.016 17.0837 140.79 18.343 140.821 19.6091C141.049 25.0814 144.923 29.1857 150.392 29.1857M128.289 29.1857C135.125 29.1857 138.087 25.5375 138.087 21.2052C138.087 11.8567 123.276 14.5928 123.276 10.0326C123.504 8.20847 125.099 6.84039 127.605 6.84039C130.34 6.84039 133.074 7.75244 134.897 9.80456L137.403 6.38436C135.125 4.10423 131.935 2.73616 127.833 2.73616C122.136 2.73616 118.491 5.92834 118.491 10.2606C118.491 19.6091 133.302 16.1889 133.302 21.6612C133.302 23.4853 131.935 25.0814 128.289 25.0814C124.643 25.0814 121.909 23.4853 120.314 21.4332L117.807 24.8534C119.143 26.2839 120.77 27.411 122.578 28.1583C124.386 28.9057 126.334 29.2561 128.289 29.1857" fill="#333E48"></path>
                </g>
                <defs>
                  <clipPath id="clip0_2_27">
                    <rect fill="white" height="70" width="471"></rect>
                  </clipPath>
                </defs>
              </svg>
            </div>
          </div>
          <h1 className="mt-6 text-center text-3xl font-bold text-gray-900">Data Workflow Platform</h1>
          <p className="mt-2 text-center text-sm text-gray-600">Sign in to your account</p>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div data-slot="card" className="bg-card text-card-foreground flex flex-col gap-6 rounded-xl border sg-card">
            <div data-slot="card-header" className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6 text-center pb-6">
              <h4 data-slot="card-title" className="text-xl font-semibold text-gray-900">Sign In</h4>
              <p data-slot="card-description" className="text-gray-600">Enter your credentials to access the platform</p>
            </div>
            <div data-slot="card-content" className="px-6 [&:last-child]:pb-6">
              <form onSubmit={handleLogin} className="space-y-6">
                {error.message && (
                  <div className={`px-4 py-3 rounded-lg text-center ${
                    error.type === "locked"
                      ? "bg-yellow-50 border border-yellow-200 text-yellow-700"
                      : "bg-red-50 border border-red-200 text-red-700"
                  }`}>
                    <p>{error.message}</p>
                    {lockedUntil && (
                      <p className="text-sm mt-1">
                        Locked until: {new Date(lockedUntil).toLocaleString()}
                      </p>
                    )}
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <p className="text-sm mt-1">
                        {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <label data-slot="label" className="items-center gap-2 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 block text-sm font-medium text-gray-700 mb-2" htmlFor="email">Email Address</label>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" aria-hidden="true">
                      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path>
                      <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    </svg>
                    <input
                      type="email"
                      data-slot="input"
                      className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex h-9 w-full min-w-0 px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-10 bg-white border-2 border-gray-300 focus:border-blue-600 focus:ring-0 rounded-sm"
                      id="email"
                      required=""
                      placeholder="your.name@gov.scot"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label data-slot="label" className="items-center gap-2 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 block text-sm font-medium text-gray-700 mb-2" htmlFor="password">Password</label>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <input
                      type="password"
                      data-slot="input"
                      className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 flex h-9 w-full min-w-0 px-3 py-1 text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-10 pr-10 bg-white border-2 border-gray-300 focus:border-blue-600 focus:ring-0 rounded-sm"
                      id="password"
                      required=""
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button data-slot="button" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:text-accent-foreground dark:hover:bg-accent/50 rounded-md gap-1.5 has-[>svg]:px-2.5 absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400" type="button">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye h-4 w-4 text-gray-500" aria-hidden="true">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <label data-slot="label" className="items-center gap-2 font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ml-2 block text-sm text-gray-700" htmlFor="remember-me">Remember me</label>
                  </div>
                  <div className="text-sm">
                    <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 focus-visible:bg-yellow-50">Forgot your password?</a>
                  </div>
                </div>
                <button data-slot="button" className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 has-[>svg]:px-3 w-full sg-button-primary rounded-sm h-12" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Need access to the platform? <a href="#" className="text-blue-600 hover:text-blue-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400 focus-visible:bg-yellow-50">Contact your administrator</a></p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">This is a prototype only and contains no real data.<br /></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
