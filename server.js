require('dotenv').config()
paypal = require('paypal-rest-sdk'),
bodyParser = require('body-parser'),
express = require('express')
app = express()
fs = require('fs')
nodemailer =require ('nodemailer')
var client_id = process.env.CLIENT_ID ;
var secret = process.env.SECRET_KEY;


app.use (express.urlencoded({ extended: false}));
app.use(express.json())
app.use(express.static('public'))

app.set ('view-engine','ejs');

app.use(bodyParser.json());



//configure for sandbox environment
paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': client_id,
    'client_secret': secret
});
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_MAIL , // TODO: your gmail account
        pass: process.env.MAIL_PASSWORD  // TODO: your gmail password
    }
});


app.get('/home',function(req,res){
    
    fs.readFile('items.json', function(error, data) {
        if (error) {
          res.status(500).end()
        } else {
          res.render('store.ejs', {items: JSON.parse(data)})}
        })
})

// page des produits
app.get ('/home/product/:id',function(req,res){
   // id = req.body.email //
   fs.readFile('items.json', function(error, data) {
    if (error) {
      res.status(500).end()
    } else {
        var productid = req.params.id
        console.log(productid)
        var items = JSON.parse(data)
        var productparams = productfinder(productid,items)
        console.log(productparams)
       
       
       
       }
        res.render('product.ejs', {item: productparams})
    })

})

//purchase
app.post ('/home/product/:id',function(req,res){
    const email= req.body.email
    console.log(email)
    
})

app.get('/home/product/pay/:id', function(req, res){
    
    let payReq = {
        'intent':'sale',
        'redirect_urls':{
            'return_url':'http://localhost:3000/process',
            'cancel_url':'http://localhost:3000/cancel'
        },
        'payer':{
            'payment_method':'paypal'
        },
        'transactions':[{
            'amount':{
                'total':'97',
                'currency':'EUR'
            },
            'description':'This is the payment transaction description.'
        }]
    }
    //payReq.transactions.amount["total"]="23"//
  
    payReq['transactions'][0]['amount']['total']= "12"
    console.log(payReq)
    fs.readFile('items.json', function(error, data) {
        if (error) {
          res.status(500).end()
        } else {
            var productid = req.params.id
            console.log(productid)
            var items = JSON.parse(data)
            var product_price = productfinder(productid,items).price/100
            console.log(product_price)
        }
      
    })
   
    
        

    //build PayPal payment request
   
    paypal.payment.create(payReq, function(error, payment){
        if(error){
            console.error(error);
        } else {
            //capture HATEOAS links
            var links = {};
            payment.links.forEach(function(linkObj){
                links[linkObj.rel] = {
                    'href': linkObj.href,
                    'method': linkObj.method
                };
            })
        
            //if redirect url present, redirect user
            if (links.hasOwnProperty('approval_url')){
                res.redirect(links['approval_url'].href);
            } else {
                console.error('no redirect URI present');
            }
        }
    });
});

app.get('/process', function(req, res){
    var paymentId = req.query.paymentId;
    var payerId = { 'payer_id': req.query.PayerID };

    paypal.payment.execute(paymentId, payerId, function(error, payment){
        if(error){
            console.error(error);
        } else {
            if (payment.state == 'approved'){ 
                console.log(payment)
                
                let mailOptions = {
                    from: 'hugospro2020@gmail.com', // TODO: email sender
                    to: 'senehugo2017@gmail.com', // TODO: email receiver
                    subject: 'Commande Paypal',
                    text: 'Your command has been treated!'
                };
                                
                transporter.sendMail(mailOptions, function(error, info){
                    if (error) {
                    console.log(error);
                    } else {
                    console.log('Email sent: ' + info.response);
                    }
                });
                res.redirect('/home')
               
            } else {
                res.send('payment not successful');
            }
        }
    });
});

function productfinder(productid,items){
            
    for(var i=0; i< items.ebook.length;i++){
        if(productid ==items.ebook[i].id){
                var product =items.ebook[i]
                return product
            }
    }
 }
app.listen(3000)