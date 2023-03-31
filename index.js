const express = require('express')
var cors = require('cors')
const { MongoClient } = require('mongodb');
const app = express()
const port = 4000
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const poolData = { UserPoolId: "us-east-1_alCcYtVmz", ClientId: "7o094l4b9nbgr74ee4j7df9bkc" };
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);


app.use(cors())

const registerUser = (email, password) => {
  const attributeList = [new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: email })];
  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributeList, null, function (err, result) {
      err && reject(err);
      resolve(result.user);
    });
  });
}

const login = (email, password) => {
  var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
    Username: email,
    Password: password,
  });
  return new Promise((resolve, reject) => {
    userPool.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        resolve(result);
        console.log('access token + ' + result.getAccessToken().getJwtToken());
        console.log('id token + ' + result.getIdToken().getJwtToken());
        console.log('refresh token + ' + result.getRefreshToken().getToken());
      },
      onFailure: (err) => {
        reject(err);
      },
    });
  });
}

let Reports;

// Connect to DB.
const connectToDb = () => {
  return new Promise((resolve, reject) => {
    const uri = "mongodb+srv://himanshu:rJndkIranluv%40t0@cluster0.mdtr1vt.mongodb.net/qualitywatch?retryWrites=true&w=majority";
    const client = new MongoClient(uri);
    client.connect().then(
      (result) => {
        Reports = client.db().collection('reports');
        resolve('connected!', result);
      },
      (error) => {
        reject(error);
      }
    );
  });
};
connectToDb();

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const user = await registerUser(email, password);
  res.send(user);
})

app.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  const token = await login(email, password);
  res.json(token);
})

app.get('/updateCoverage/:branch/:coverage', async (req, res) => {
  const { branch, coverage } = req.params;
  const result = await Reports.findOneAndUpdate({ branch }, { $set: { branch, coverage } }, { upsert: true });
  res.sendStatus(result?.ok ? 200 : 500);
})

app.get('/coverage/:branch?', async (req, res) => {
  const { branch } = req.params;
  const result = await Reports.find({}).toArray();
  res.send(result);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})