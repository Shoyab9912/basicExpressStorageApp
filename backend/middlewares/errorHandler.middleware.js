

export const errorHandler = (err, req, res, next) => {
    console.error({
        method: req.method,
        url: req.originalUrl,
        name: err.name,
        message: err.message,
    });

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];

        return res.status(409).json({
            status: "error",
            message: `${field} already exists`,
        });
    }

    if (err.name === "CastError") {
        return res.status(400).json({
            status: "error",
            message: "Invalid ID",
        });
    }

    

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: "error",
            message: err.message,
            ...(err.errors && { errors: err.errors }),
        });
    }

    return res.status(500).json({
        status: "error",
        message: "Internal Server Error",
        ...(process.env.NODE_ENV !== "production" && {
            error: err.message,
            stack: err.stack,
        }),
    });
};