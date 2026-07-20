import React from "react";

interface StepperProps {
  currentStep: number;
  totalSteps?: number;
}

const Stepper: React.FC<StepperProps> = ({ currentStep, totalSteps = 3 }) => {
  // Create an array representing each step [1, 2, 3, ...]
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-center w-full max-w-md mx-auto py-4">
      {steps.map((step, index) => {
        const isCompleted = step < currentStep;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step}>
            <div className="flex items-center justify-center shrink-0">
              {isCompleted ? (
                <div className="size-6 rounded-full bg-mint-green grid place-items-center text-white">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : (
                // Incomplete State (Light gray ring, white background, gray dot)
                <div className="size-6 rounded-full border-2 border-[#E5E7EB] bg-white grid place-items-center">
                  <div className="size-1.5 rounded-full bg-grey-c400"></div>
                </div>
              )}
            </div>

            {/* Connecting Line */}
            {!isLast && (
              <div
                className={`flex-1 h-0.5 ${
                  isCompleted ? "bg-mint-green" : "bg-grey-c300"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
