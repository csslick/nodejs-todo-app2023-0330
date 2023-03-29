const { urlencoded } = require('express');
const express = require('express');
const { Collection, ObjectID } = require('mongodb');
const format = require('date-format');
const app = express();
const PORT = 3001;

app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');

const MongoClient = require('mongodb').MongoClient;
const uri = mongodb_API_URL;

let db;
let count = 0;
MongoClient.connect(uri, async(err, client) => {
  if(err) return console.log(err)
  db = await client.db('todoapp');
  count = await db.collection('post').count();
  console.log('post count = ', count)
  app.listen(3001, () => {
    console.log(`server run at ${PORT}`)
  })
  
})


app.get('/', async (req, res)=> {
  await db.collection('post').find().toArray(async(err, posts) => {
    if(err) return console.log(err)
    count = await db.collection('post').count();
    res.render('index', { 
      posts: posts,
      count: count 
    })
  })
})

app.get('/write', (req, res) => {
  res.render('write');
})

app.post('/add', (req, res) => {
  console.log(req.body)
  // db 저장
  db.collection('post').insertOne({
    title: req.body.title, 
    date: req.body.date
  }, (err, res) => {
    console.log('저장완료');
  })
  res.redirect('/');
})

app.post('/delete', (req, res) => {
  const id = req.body.id;
  const objectId = new ObjectID(id);
  db.collection('post').deleteOne({_id: objectId}, (err, data) => {
    if(err) return console.log(err)
    console.log('delete id: ', id);
    res.status(200).redirect('/');
  })
})

app.get('/detail/:id', (req, res) => {
  console.log(req.params.id);
  const id = req.params.id; 
  const objectId = new ObjectID(id);
  db.collection('post').findOne({_id: objectId}, (err, data) => {
    if(err) return console.log(err);
    console.log(data);
    res.render('detail', { data });
  })
}) 

app.get('/edit/:id', (req, res) => {
  const { id } = req.params;
  const objectId = new ObjectID(id);
  db.collection('post').findOne({_id: objectId}, (err, data) => {
    if(err) return console.log(err);
    console.log(data);
    const id = data._id;
    const title = data.title;
    const date = data.date;
    res.render('edit', { id, title, date });
  })
})

app.post('/update', (req, res) => {
  const { id, title, date } = req.body;
  const objectId = new ObjectID(id);
  db.collection('post').updateOne(
    { _id: objectId }, 
    { $set: { title, date } },
    (err) => {
      if(err) return console.log(err);
      res.status(200).redirect('/');
    }
  )  
})
