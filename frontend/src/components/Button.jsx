export default function Button({
    children,
    onClick,
    type = "button",
    variant = "primary", // primary | secondary | danger | ghost
    size = "md",          // sm | md | lg
    disabled = false,
    loading = false,
    fullWidth = false,
    className = "",
    ...props
}) {
    const baseStyles =
        "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary:
            "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
        secondary:
            "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400",
        danger:
            "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
        ghost:
            "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-300",
    };

    const sizes = {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""
                } ${className}`}
            {...props}
        >
            {loading ? (
                <span className="flex items-center gap-2">
                    <svg
                        className="animate-spin h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                    </svg>
                    Loading...
                </span>
            ) : (
                children
            )}
        </button>
    );
}