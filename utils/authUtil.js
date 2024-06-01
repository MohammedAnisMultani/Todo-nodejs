const isEmailValidator = ({str}) => { //function to check/varify email
    const isEmail =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i.test(
        str
      );
    return isEmail;
  };

const userDataValidation = ({name, email, username, password}) =>{
   return new Promise((resolve, reject)=> {
    if(!name || !email || !password || !username)  reject("Data Missing")

        if(typeof name != "string") reject("name is not a text")
        if(typeof email != "string") reject("email is not a text")
        if(typeof username != "string") reject("username is not a text")
        if(typeof password != "string") reject("password is not a text")

        if(username.length < 3 || username.length > 50) return("username length must be of 3-50 char")

        if(!isEmailValidator({str : email})) reject("Email format is incorrect")


    resolve()
   })
}
module.exports = {userDataValidation, isEmailValidator}