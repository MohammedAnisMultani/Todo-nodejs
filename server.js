//IMPORTS
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs")
const session = require("express-session")
const mongodbSession = require("connect-mongodb-session")(session)

//importing env:
require('dotenv').config()
// console.log(process.env)

//FILE-IMPORT:
const userModel = require('./models/userModel')
const {userDataValidation, isEmailValidator} = require('./utils/authUtil');
const isAuth = require("./middleware/isAuthMiddleware");
const todomodel = require("./models/todomodel");



// -------------
//CONSTANTS
const app = express();
const PORT = process.env.PORT || 8000; //but we are writing (explaination below)
// generally we dont define port in env bcz
// when we go into the production part they assign us port which are free
// so we usually dont write it in env 
const store = new mongodbSession({
  uri : process.env.MONGO_URI,
  collection : "sessions"
  
})




// -------------
//MIDDLEWARE
app.use(express.urlencoded({extended : true})) // for forms
app.use(express.json()) // for fetch and axios
app.set("view engine", "ejs")
app.use(session({
  secret : process.env.SECRET_KEY,
  store : store,
  resave : false,
  //whenever i am modifing the session then only not every time when a 
  //req. is coming (Explaination: todo2 1:46:00)
  saveUninitialized : false
  //There are many public api where the session is not require
  //So whenever we will hit such api it will not gone save the sessions into them
}))
//need to connect the public folder/files
app.use(express.static("public"))






//-----------
//Db CONNECTION
mongoose
  .connect(process.env.MONGO_URI)   
  .then(() => {
    console.log("MongoDb connected");
  })
  .catch((err) => {
    console.log(err);
  });




//------------
// API's
app.get("/", (req, res) => {
  console.log("we are all set at home page");
  return res.send("i am homepage");
});


//register
app.get("/register",(req,res)=> {
    return res.render("registerPage") // giving the name of the file i already now that why not giving it as test.ejs
})

//register-user
app.post("/register-user", async (req,res)=> {
    console.log(req.body)
    const{name, email, username, password} = req.body

//checking data for validation
  try{
    await userDataValidation({name, email, username, password})
  }
  catch(e){
    return res.status(400).json("error")
  }

   //find the user if exist with email and username
  const userEmailExist = await userModel.findOne({ email })
  console.log(userEmailExist)
  if(userEmailExist){
   return res.send({
      status : 400,
      message : "Email already exist"
    })
  }


  const userUsernameExist = await userModel.findOne({username})
  if(userUsernameExist)
   return res.send({
    status : 400,
    message : "Username already exist"

    })


  const hashedPassword = await bcrypt.hash(
    password,
    parseInt(process.env.SALT) 
    
  )
  console.log(hashedPassword)
     const userObj = new userModel({
        name : name,
        email : email,
        username : username,
        password : hashedPassword
     })
     
     try{
        const userDb = await userObj.save()
        console.log(userDb)
        return res.send({
            status : 200,
            message : "send successful",
            data : userDb
        })
     }

    

      catch(e){
        return res.send({
            status : 500,
            message : "Internal server error",
            error : e
        })
     }

   return res.send("we are getting data from register")
})

//login
app.get("/login",(req,res)=>{
    return res.render("loginPage")
})

app.post("/login-user", async (req,res)=>{
  console.log(req.body)
  const {loginId, password} = req.body

  if(!loginId || !password)
    {
      return res.status(400).json("Missing login credentials")
    }

    //Find the user with loginId
    try{
      let userDb;
      if(isEmailValidator({str : loginId}))
       {
        userDb = await userModel.findOne({email : loginId})
       }
      else{
        userDb = await userModel.findOne({username : loginId})
      }
      
    if(!userDb)
      return res.status(400).json("user not found, please register first")


    
    // comparing the password
    // console.log(password, userDb.password)
    
    const isMatch = await bcrypt.compare(password, userDb.password)
    // console.log(isMatch)
    if(!isMatch)
      return res.status(400).json("password is not matched")
    
    // session base auth
    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,// If face any error: userDb._id.toString(),|| 
      //or at the top add this: const {ObjectId} = require("mongoDb") 
      // then add this here   : new ObjectId(userDb._id)
      email: userDb.email,
      username: userDb.username
    };
    
    return res.redirect("/dashboard");
 
  }
    catch(error){
      return res.send({
        status : 500,
        message : "internal server error",
        error : error
      })
    }


  })


//Dashboard
//Protected API  
app.get("/dashboard",isAuth, (req,res)=> {
  // console.log(req.session.id)
  // console.log(req.session)
  // return res.send("Dashboard page")
  // return res.send("Dashboard Page")
  return res.render("dashboardPage")
 
})

app.post("/logout",isAuth, (req,res) => {
  console.log("Logout")

  req.session.destroy((err)=> {
    if(err) return res.status(500).json(err)
      return res.redirect("login")
  }) 
})

// ----------
// Todo api's

app.post('/create-item', isAuth, async (req, res)=> {
  console.log(req.body)

  const todoText = req.body.todo//we have set the class in HTML as todo from there we are getting it
  const username = req.session.user.username

  //data validation
  if(!todoText){
    return res.send({
      status : 400,
      message : "Missing todo text"
    })
  };

  if(typeof todoText !== 'string')
    {
      return res.send({
        status : 400,
        message : "To do is not a Text"
      })
    }

// create an object
// obj.save()

const todoObj =  todomodel({
  //Schema : value
  todo : todoText,
  username : username
})

try 
{
  const todoDb = await todoObj.save()
  return res.send({
    status : 201,
    message : "Todo created successfully",
    data : todoDb
  })
}
catch(e)
{
  return res.send({
    status : 500,
    message : "Internal server error",
    error : error
  })
}

  return res.send("Todo created successfully")

})
// ---------------
// read-item
// read-item?skip=10
// whatever we pass in query the value is passed as string
// so we need to convert it into the number
app.get('/read-item', isAuth, async (req, res)=>{
  const SKIP = Number(req.query.skip) || 0
  console.log(req.skip)
  console.log(SKIP)
  const LIMIT = 10
  console.log(typeof SKIP, SKIP )
  const username = req.session.user.username;


  try
  {
  // const todoDb = await todomodel.find({username : username})
  const todoDb = await todomodel.aggregate([
    {
      $match : {username : username}
    },
    {
      $skip : SKIP
    },
    {
      $limit : LIMIT
    }
  ])
  if(todoDb.length == 0)
    {
      return res.send({
        status : 204,
        message : "No todo's Found"
      })
    }
  
    return res.send({
      status: 200,
      message: "Read Success",
      data: todoDb
    })
  }
  catch(e)
  {
    return res.send(
      {
        status : 500,
        message : "Internal server error",
        error : e
      }
    )
  }
})
// -------------------
//Edit-item

app.post('/edit-item', isAuth, async(req, res)=>{
  const newData = req.body.newData;
  const todoId = req.body.todoId;
  const usernameReq = req.session.user.username;
  console.log(newData, todoId)


  //data validation
  if(!todoId)
    {
      return res.send({
        status : 400,
        message : "missing todo id"
      })
    }
    if(!newData)
    {
      return res.send({
        status : 400,
        message : "Missing todo text"
      })
    }
    if(typeof newData !== "string")
      {
        return res.send({
          status : 400,
          message : "Todo is not a text"
        })
      }

      try
      {
        //find the todo from db
        const todoDb = await todomodel.findOne({_id: todoId})
        console.log(todoDb.username, usernameReq)


         //ownership check
      if(todoDb.username !== usernameReq)
        {
          return res.send({
            status : 403,
            message : "Not allowed to edit the todo"
          })
        }

        //data modification
     const prevDataDb = await todomodel.findOneAndUpdate({
      _id : todoId
      },
      {
        todo :newData
      }
    )
    return res.send({
      status: 200,
      message: "Todo upadted successfully",
      data: prevDataDb
    })

      }
      catch(e){
        return res.send({
          status : 500,
          message : "Internal server error",
          error : e
        })
      }
     

})

//delete-item

app.post('/delete-item', isAuth, async(req,res)=>{
  const todoId = req.body.todoId
  console.log(req.body)
  console.log(todoId)
  const usernameReq = req.session.user.username

  if(!todoId)
    {
      return res.send({
        status : 400,
        message : "Missing todo id"
      })
    }
    try{
     const todoDb = await todomodel.findOne({_id : todoId})


     if(todoDb.username !== usernameReq){
      return res.send({
        status : 403, //forbidden
        message : "Not allowed to delete the todo"
      })
     }
     const prevDataDb = await todomodel.findOneAndDelete({ _id : todoId}) //delete one()
     return res.send({
      status: 200,
      message: "Todo delete successfully",
      data: prevDataDb
     })

    }
    catch(e)
    {
      return res.send({
        status : 500,
        message : "Internal server error",
        error : e
      })      
    }
})

app.listen(PORT, () => {
  console.log("Server running at port: " + PORT);
});


 
//-----------
