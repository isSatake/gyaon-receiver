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

window.onload = function(){
  var socket = io.connect('https://linda-server.herokuapp.com');
  var source = location.search.substring(1).split('&')[0] || localStorage.getItem("source") || "global";
  var linda = new Linda().connect(socket);
  var ts = linda.tuplespace(source);

  linda.io.on('connect', function(){
    console.log('socket.io connect!!');
    watchId = ts.watch({type:"gyaon"}, function(err, tuple){
      if(err) return;
      print(tuple.data);
      play(tuple.data.url)
    });
  });

  var setSource = document.getElementById("setSource");
  setSource.value = source;
  setSource.onchange = function(event){
    var source = event.target.value
    localStorage.setItem("source", source)
    location.reload()
  }
}
