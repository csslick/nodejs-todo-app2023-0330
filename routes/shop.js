const router = require('express').Router();

// 로그인 확인 미들웨어
function isLogin(req, res, next) {
  if(req.user) {
    next();
  } else {
    res.send('로그인 안함');
  }
}

router.get('/shirts', isLogin, function(req, res){
  res.send('셔츠 파는 페이지입니다.');
});

router.get('/pants', isLogin, function(req, res){
  res.send('바지 파는 페이지입니다.');
}); 

module.exports = router;