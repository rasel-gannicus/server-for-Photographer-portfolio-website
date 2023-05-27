
const express = require('express');
const app = express() ; 
const port = process.env.REACT_APP_PORT || 5000 ; 
const cors = require('cors');

app.use(cors());
app.use(express.json()); 


app.get('/', (req, res)=>{
    res.send('Hello photographer') ; 
})


app.listen(port, ()=>{
    console.log('Listening to port')
})