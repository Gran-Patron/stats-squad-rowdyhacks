import React from "react";

interface LogoutButtonProps {
  onLogout: () => void;
  isLoading?: boolean;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ onLogout, isLoading }) => {
  return (
    <button
      onClick={onLogout}
      disabled={isLoading}
      className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-md font-medium hover:bg-zinc-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isLoading ? "Logging Out..." : "Log Out"}
    </button>
  );
};

export default LogoutButton;
