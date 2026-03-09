


const errorHandler = (err, req, res, next) => {
    console.error(`${err.name} ${err.message} stack: ${err.stack}`);

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            status: 'error',
            error: `${field} already exists`,
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(422).json({
            status: 'error',
            message: 'Validation failed',
            fields: Object.values(err.errors).map(e => ({
                field: e.path,
                message: e.message,
            })),
        });
    }

    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
            ...(err.fields && { fields: err.fields }),
        });
    }

    return res.status(500).json({
        status: "error",
        error: err.message,
        stack: process.env.NODE_ENV === 'production' ? "something went wrong": err.stack,
    })

}



export {errorHandler}