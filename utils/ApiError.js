class ApiError extends Error {
    constructor(
        statusCode,
        message="Error",
        error=[],
        stack=""
    ){
        super(message);
        this.message = message;
        this.statusCode = statusCode;
        this.error = error;
        this.success = false;

        if(stack){
            this.stack = stack;
        }else{
            Error.captureStackTrace(this,this.constructor);
        }
    }
}

export default ApiError;