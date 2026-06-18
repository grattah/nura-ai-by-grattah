import React from "react";
import { ProgressBar } from "../ProgressBar";
import { Info, Zap } from "lucide-react";
import Link from "next/link";

const PersonalizedTokenModal = () => {
  return (
    <div className="p-4 rounded-2xl bg-white flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <p className="font-semibold text-black max-[400px]:text-sm text-center">
          You're almost out of free credits
        </p>
        <ProgressBar value={92} color="#F39128" trackColor="#ECEBEA" />
        <div className="flex justify-between items-center">
          <p className="font-semibold text-[#F39128] text-sm max-[400px]:text-xs">
            92% used
          </p>
          <p className="font-medium text-subtle text-sm max-[400px]:text-xs">
            Resets Jun 12, 2025
          </p>
        </div>
      </div>
      <div className="bg-[#F391281A] rounded-lg p-3 flex gap-1 items-start">
        <Info color="#F39128" size={24} strokeWidth={1.67} />
        <p className="font-medium text-sm text-[#1B1D1D] max-[400px]:text-xs">
          You can get extra tokens to continue enjoying this feature
        </p>
      </div>
	  <div className="w-full">
		<Link href="/buy-tokens" className="w-full flex gap-1 justify-center items-center rounded-full py-3.75 bg-mint-green">
			<Zap size={18} color="#FFFFFF" strokeWidth={2} />
			<span className="text-white font-medium max-[400px]:text-sm">Get extra tokens</span>
		</Link>
	  </div>
    </div>
  );
};

export default PersonalizedTokenModal;
