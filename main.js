var socket = io.connect('http://linda-server.herokuapp.com:80');
var linda = new Linda().connect(socket);

var ts = linda.tuplespace('masuilab');

linda.io.on('connect', function(){
  print('socket.io connect!!');

  ts.watch({type:"gyaon"}, function(err, tuple){
    if(err) return;
    print(tuple.data);
    play(tuple.data.url)
  });

});

var play = function(url){
  var audio = new Audio(url);
  console.log(audio.src)
  audio.type = 'audio/wav';
  audio.play()
}

var getTime = function(){
  var now = new Date()
  var hour = now.getHours();
  var min = now.getMinutes();
  var sec = now.getSeconds();
  return `${hour}:${min}:${sec}`
}

var print = function(data){
  var url = data.url
  if(url === undefined) return

  var message = data.message === undefined ? "sound" : data.message
  var user = data.user
  var a = `<a href="${url}">${message}</a>`
  $("#container").prepend(`<li>${getTime()} ${user}「${a}」</li>`)
};
