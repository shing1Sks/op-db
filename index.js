import connectToDB from "./dbMongo.js";
import app from "./expressApp.js";

const main = () => connectToDB().then(
    ()=>{
        console.log("mongodb connected");
        app.on("error",(e)=>{
            console.log(e,"unable to connect to express app !");
        })
        const port = process.env.PORT || 3000
        app.listen(port,()=>{
            console.log(`server connected on port : ${port} !`)
        })
    }
).catch(
    (e)=>{
        console.log("handle this error @ index.js")
    }
)

export default main