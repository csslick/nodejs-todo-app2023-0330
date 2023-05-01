const path = require('path');
const { urlencoded } = require('express');
const express = require('express');
const { Collection, ObjectID } = require('mongodb');
const format = require('date-format');
const app = express();
const PORT = 3001;

// 로그인 관련 모듈
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

// app.use() 미들웨어: 요청과 응답 사이에 실행되는 코드
const flash = require('express-flash');
app.use(flash());

app.use(session({
  secret: '1234', //  세션 비번
  reserve: true, 
  saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.set('view engine', 'ejs');
// 정적 파일 제공을 위한 미들웨어 등록
app.use(express.static(path.join(__dirname, 'public')));

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://admin:qwer1234@cluster0.rafr5g9.mongodb.net/?retryWrites=true&w=majority";

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

// 로그인시 실행되는 미들웨어 
passport.use(new LocalStrategy({
  usernameField: 'id',
  passwordField: 'pwd',
  session: true,  // 로그인 후 세션 저장 유무
  passReqToCallback: false,
}, function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (err,res) {
    if (err) return done(err)
    // 일치하는 아이디 없을 때
    if (!res) return done(null, false, { message: '존재하지않는 아이디요' })
    // 비번 채크
    if (입력한비번 == res.pwd) {
      return done(null, res)
    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));

// 로그인 성공시 id를 이용하여 세션을 저장하는 코드
passport.serializeUser((user, done) => {
  done(null, user.id)
})

// 세션데이터를 확인하여 DB에서 사용자 확인(마이페이지 접속시)
passport.deserializeUser((id, done) => {
  db.collection('login').findOne({id: id}, (err, res) => {
    done(null, res)
  })
})


app.get('/', async (req, res)=> {
  const successMsg = await req.flash('success');
  console.log('successMsg = ', successMsg);
  await db.collection('post').find().toArray(async(err, posts) => {
    if(err) return console.log(err)
    count = await db.collection('post').count();
    res.render('index', { 
      successMsg: successMsg,
      posts: posts,
      count: count,
    })
  })
})

app.get('/write', (req, res) => {
  res.render('write');
})

app.post('/add', (req, res) => {
  // console.log(req.body)
  console.log("add: user._id", req.user._id)
  console.log("add: user.id", req.user.id)
  // db 저장
  db.collection('post').insertOne({
    title: req.body.title, 
    date: req.body.date,
    author: req.user.id,
    user_id: req.user._id
  }, (err, res) => {
    console.log('저장완료');
  })
  res.redirect('/');
})


// 본인 글만 삭제처리: 글 _id와 작성자 확인
app.post('/delete', (req, res) => {
  console.log('user.id = ', req.user._id)
  console.log('author: ', req.user.id);
  const id = req.body.id; // post id
  const objectId = new ObjectID(id);
  db.collection('post')
    // {글번호, 작성자id}
    .deleteOne({_id: objectId, user_id: req.user._id}, (err, data) => {
      if(err) {
        console.log(err);
        res.status(500).send('서버 에러 발생'); // 서버 에러 발생 시 클라이언트에게 500 상태 코드와 에러 메시지 전송
        return; 
      }

      if(data.deletedCount === 0) { // 삭제된 데이터가 없으면, user_id가 일치하지 않는 경우로 간주
        res.status(403).send('작성자만 삭제할 수 있습니다.'); // 클라이언트에게 403 상태 코드와 에러 메시지 전송
        return;
      }
      console.log('삭제완료');
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


app.get('/login', (req, res) => {
  res.render('login')
})

// 로그인 요청시 인증처리
app.post('/login', passport.authenticate('local', {
  failureRedirect: '/fail', // 로그인 실패시
  failureFlash: true // 플래시 메시지를 사용하도록 설정
}), (req, res) => {
  req.flash('success', '로그인 성공!');
  res.redirect('/');  // 로그인 성공시
})

app.get('/mypage', isLogin, (req, res) => {
  console.log(req.user);
  res.render('mypage.ejs', { 
    user: req.user,
  }); 
})
  
// 로그인 확인 미들웨어
function isLogin(req, res, next) {
  if(req.user) {
    next();
  } else {
    // res.send('로그인 안함');
    res.json({
      isLogin: false,
      msg: '로그인을 해주세요'
    })
  }
}



// app.get('/search', async(req, res) => {
//   console.log(req.query)
//   // find() 일치하는 결과만 찾아줌
//   await db.collection('post')
//     .find({title: req.query.val}).toArray(async(err, posts) => {
//     console.log(posts);
//     count = await db.collection('post').count();
//     res.render('index', {
//       posts: posts,
//       count: posts.length
//     })
//   })
// })

/*** index 검색 ***/
app.get('/search', async(req, res) => {
  console.log(req.query)
  // 검색조건
  const rule = [
    {
      $search: {
        index: "title",
        text: {
          query: req.query.val,
          path: {
            wildcard: "*"
          }
        }
      }
    },
    { $sort : { _id: 1 } },  // _id 오름차순 정렬
    { $limit: 10 }   // 찾을 개수
  ]
  await db.collection('post')
    .aggregate(rule).toArray(async(err, posts) => {
    console.log(posts);
    count = await db.collection('post').count();
    res.render('index', {
      posts: posts,
      count: posts.length
    })
  })
})


/*** 회원가입 
 * passport 관련 함수 아래에 작성
 * ***/
app.post('/register', (req, res) => {
  db.collection('login').insertOne({
    id: req.body.id, 
    pwd: req.body.pwd
  }, (err, data) => {
    res.redirect('/');
  })
})



// router 미들웨어
app.use('/shop', require('./routes/shop.js'));



// Upload
app.get('/upload', (req, res) => {
  res.render('upload.ejs', {
    title: '업로드'
  })
})

// multer 설치 후 미들웨어 설정
const multer = require('multer');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/images');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
}) 

const upload = multer({ storage: storage })

// upload.single(input name 속성명)
app.post('/upload', upload.single('image'), (req, res) => {
  res.json({
    msg: '이미지 전송완료'
  })
})


//  채팅 생성
app.post('/chat', isLogin, async (req, res) => {
  console.log(req.user);  
  console.log('req.body', req.body)
  const author = ObjectID(Number(req.body.author))
  const data = {
    title: '채팅방',
    member: [author, req.user._id],
    date: new Date().toLocaleDateString()
  }
  console.log(data)
  await db.collection('chat').insertOne(data);
  res.json({
    msg: "대화창",
    data: req.body
  })
})

app.get('/chat', isLogin, async (req, res) => {
  await db.collection('chat')
    .find({member: req.user._id}).toArray((err, rooms) => {
    if(err) return console.log(err)
  
    res.render('chat.ejs', { 
      data: rooms,
    })
  })
})


app.post('/message', isLogin, async (req, res) => {
  try{
    console.log(req.body);
    const data = {
      parent: req.body.parent,
      content: req.body.content,
      userid: req.user._id,
      date: new Date().toLocaleString(), 
    }
    console.log(data)
    await db.collection('message').insertOne(data);
    res.json({msg: 'success'})
  } catch(err) {
    console.log(err, '메시지 쓰기 오류')
    res.json({msg: err});
  }
})