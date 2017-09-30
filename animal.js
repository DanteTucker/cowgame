class objectmanager{
	constructor(){
		this.objects = [];
		this.cast = ["models/animal6.json","models/world2.js"];
		this.loaded = 0;
	}
	loadobjects(){
			if (this.cast[this.loaded].indexOf(".json") === -1){
				var loader = new THREE.ObjectLoader();

				loader.load(this.cast[this.loaded],function ( obj ) {
					objman.objects.push(obj);
					objman.objects[objman.loaded].name = objman.cast[objman.loaded];
					objman.loaded++;
					objman.loadcheck();
				
				});
			}else{
				var loader = new THREE.JSONLoader();
				loader.load(this.cast[this.loaded],function ( obj,mat ) {
					
					mat.forEach(function (material) { material.skinning = true; });
					var meshmat = new THREE.SkinnedMesh(obj, new THREE.MeshFaceMaterial(mat));
				
					objman.objects.push(meshmat);
					objman.objects[objman.loaded].name = objman.cast[objman.loaded];
					objman.loaded++;
					objman.loadcheck();
				});
			}
			
	}
	loadcheck(){
		if(this.loaded === this.cast.length){
			loaded = true;
			render();
		} else {
			this.loadobjects();
		}
	}
	getmodel(mname){
		if (mname.name.indexOf(".json") === -1){
			return this.objects[this.objects.findIndex(function(element){return element.name === this.name;},mname)].clone();
		} else {
			return this.objects[this.objects.findIndex(function(element){return element.name === this.name;},mname)].clone();
		}
	}
}

class playermanager{
	constructor(){
		this.players = [];
	}
	create(data){
		this.players.push(new player(data.id,data.color));
		this.players[this.players.length - 1].create({x: 0,y: 0,z: 0},false);
	}
	destroy(data){
		var playerindex = this.findplayer(data);
		this.players[playerindex].destroy();
		this.players.slice(playerindex,1);
	}
	moveplayer(data){
		var playerindex = this.findplayer(data);
		if(playerindex === -1){
			this.create(data);
			playerindex = this.findplayer(data);
		}
		this.players[playerindex].setstate.moving = data.state.moving;
		this.players[playerindex].animset();
		this.players[playerindex].move(data);
	}
	findplayer(data){
		return this.players.findIndex(function(element){
			if(element.id === this.id){
				return true;
			} else {
				return false;
			}
		},data);
	}
	animupdate(){
		this.players.forEach(function(element){
			element.animmixer.update(delta);
		});
	}
}

class chatManager{
	constructor(){
		this.chat = [];
		this.chatbar =
			'<div id="overlaychat" style="position: absolute; bottom: 20px; left: 20px">'+
			'<div id="chatbarcontainer" class ="info">'+
			'<input type="text" name="chatbar" id="chatbar" style="width: 400px">'+
			'</div></div>';
		this.chatbarvis = false;
	}
	addChat(msg){
		this.chat.push(msg);
		if(this.chat.length > 5){
			this.chat = this.chat.slice(1,6);
		}
		this.refreshChat();
	}
	refreshChat(){
		var output = "";
		for(var i = 0; i < this.chat.length; i++){
			output += this.chat[i];
			output += "<br>";
		}
		$('#loading').html(output);
	}
	createChatbar(){
		$('body').append($(this.chatbar));
		$('#overlaychat').hide();
		$('#chatbar').bind('keyup', function(e) {
    		if ( e.keyCode === 13 ) {
        		chatsystem.enterchat();
    		}
		});
	}
	toggleChatbar(toggle){
		if(toggle && !this.chatbarvis){
			$('#overlaychat').show();
			camcontrols.togglecontrols(false);
			$('#chatbar').focus();
			this.chatbarvis = true;
		} else {
			$('#overlaychat').hide();
			camcontrols.togglecontrols(true);
			this.chatbarvis = false;
		}
	}
	enterchat(){
		if(this.chatbarvis){
			var enteredchat = $('#chatbar').val();
			this.addChat(p1.id+": "+ enteredchat);
			socket.emit('chat',{chat: p1.id+": "+ enteredchat});
			$('#chatbar').val("");
			this.toggleChatbar(false);
		}
	}
}


class actionManager{
	constructor(){

	}
	doAction(obj){
		if(obj.object.userData['player']){
			socket.emit('chat',{chat:p1.id + ' pokes ' + obj.id});
			chatsystem.addChat(p1.id + ' pokes ' + obj.id);
		}
	}
	check(){
		manager.players.forEach(function(element){
			var pbbox = new THREE.Box3();
			pbbox.setFromObject(p1.actionbox);
			var objbbox = new THREE.Box3();
			objbbox.setFromObject(element.object);
			if(objbbox.intersectsBox(pbbox)){
				actions.doAction(element);
			}
		});
	}
}

class player{
	constructor(id,pcolor){
		this.id = id;
		this.object;
		this.local;
		this.animmixer;
		this.walk;
		this.setstate = {moving: false};
		this.namesprite;
		this.color = pcolor;
		this.actionbox;
	}
	create(pos,local){
		this.local = local;
		this.object = objman.getmodel({name:"models/animal6.json"});
		this.object.material = new THREE.MeshPhongMaterial({color: new THREE.Color(parseInt(this.color,16))});
		this.object.material.skinning = true;
		this.object.userData["player"] = true;
		this.animmixer = new THREE.AnimationMixer(this.object);
		this.walk = this.animmixer.clipAction(this.object.geometry.animations[0]);
		scene.add(this.object);
		this.namesprite = makeTextSprite( this.id, 
		{ fontsize: 32, fontface: "Georgia", borderColor: {r:0, g:0, b:255, a:1.0} } );
		this.namesprite.position.set(0,10,-3);
		this.object.add(this.namesprite);
		this.walk.play();
		chatsystem.addChat(this.id+" joined");

		if(local){
			var geometry = new THREE.BoxGeometry( 4, 8, 4 );
			var material = new THREE.MeshBasicMaterial( {color: 0x000000} );
			this.actionbox = new THREE.Mesh(geometry,material);
			this.actionbox.position.set(0,4,-8);
			this.actionbox.visible = false;
			scene.add(this.actionbox);
			this.object.add(this.actionbox);
		}
		
	}
	destroy(){
		chatsystem.addChat(this.id+" left");
		scene.remove(this.object);
	}
	move(data){
		this.object.position.set(data.pos.x,data.pos.y,data.pos.z);
		this.object.rotation.set(data.rot._x,data.rot._y,data.rot._z);
	}
	animset(){
		if(this.setstate.moving === true){

			this.walk.enabled = true;
		} else if(this.setstate.moving === false){

			this.walk.enabled = false;
		}
	}
}


var p1;
var rezzed = false;
var lookloc;
var objman = new objectmanager();
var camcontrols = false;
objman.loadobjects();

var clock = new THREE.Clock();

var tempworld;
var delta;

var manager = new playermanager();

var actions = new actionManager();

var chatsystem = new chatManager();
chatsystem.createChatbar();
chatsystem.addChat("Connecting to server");



//socket.on('join',function(msg){
//	manager.create(msg);
//});
socket.on('move',function(msg){
	manager.moveplayer(msg);
});
socket.on('remove',function(msg){
	manager.destroy(msg);
});
socket.on('online',function(msg){
	chatsystem.addChat("Connected");
});
socket.on('chat',function(msg){
	chatsystem.addChat(msg.chat);
});
function render() {
     renderer.render(scene, camera);

	delta = clock.getDelta();
	
	if(loaded){
			
		if(!rezzed){
			if(playernick !== ""){
				p1 = new player(playernick,playercolor);
			} else {
				p1 = new player(new Date().valueOf(),playercolor);
			}
			p1.create({x: 0,y: 0,z: 0},true);
			console.log(p1.object);
			lookloc = new THREE.Vector3(p1.object.position.x,10,p1.object.position.z);
			camera.lookAt(lookloc);
			
			p1.object.add(camera);
			camcontrols = new THREE.FirstPersonControls(p1.object);
			camcontrols.lookSpeed = 0.4;
        	camcontrols.movementSpeed = 20;
        	camcontrols.noFly = true;
        	camcontrols.lookVertical = false;
			camcontrols.togglecontrols(true);

			$(document).mouseleave(function () {
    			camcontrols.mousein = false;
				console.log('out');
			});
			$(document).mouseenter(function () {
    			camcontrols.mousein = true;
				console.log('in');
			});

			tempworld = objman.getmodel({name:"models/world2.js"});
			scene.add(tempworld);
			rezzed = true;
			socket.emit('join',{id: p1.id,color:p1.color});
			
			
		}
		if(camcontrols){
			camcontrols.update(delta);
			p1.animset();
			p1.animmixer.update(delta);
			manager.animupdate();
			socket.emit('move',{pos: p1.object.position, rot: p1.object.rotation, id: p1.id, state: p1.setstate,color: p1.color});
			/*scene.children[2].children.forEach(function(element){
				var pbbox = new THREE.Box3();
				pbbox.setFromObject(p1.object);
				var objbbox = new THREE.Box3();
				objbbox.setFromObject(element);
				if(objbbox.intersectsBox(pbbox)&&element.userData["collidable"]){
					console.log('hit');
				}
			});*/
		}	
		
	}
    requestAnimationFrame(render);
}
