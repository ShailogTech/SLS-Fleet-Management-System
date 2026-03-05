import React from 'react';
import Lottie from 'lottie-react';
import truckAnimation from '../../assets/truck-loading.json';

const TruckLoader = ({ message, fullScreen = false }) => {
  return (
    <div className={`flex items-center justify-center ${fullScreen ? 'h-screen' : 'h-96'}`}>
      <div className="text-center">
        <div className="w-48 h-48 mx-auto">
          <Lottie animationData={truckAnimation} loop={true} speed={2.5} />
        </div>
        {message && <p className="mt-2 text-slate-500 text-sm font-medium">{message}</p>}
      </div>
    </div>
  );
};

export default TruckLoader;
