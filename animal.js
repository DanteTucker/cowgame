class objectmanager{
	constructor(){
		this.objects = [];
		this.cast = ["animal6.json","world.js"];
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
		this.players.push(new player(data.id));
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


class player{
	constructor(id){
		this.id = id;
		this.position = {x: 0, y: 0, z: 0};
		this.object;
		this.local;
		this.animmixer;
		this.walk;
		this.setstate = {moving: false};
		this.namesprite;
	}
	create(pos,local){
		this.local = local;
		this.object = objman.getmodel({name:"animal6.json"});
		this.animmixer = new THREE.AnimationMixer(this.object);
		this.walk = this.animmixer.clipAction(this.object.geometry.animations[0]);
		scene.add(this.object);
		this.namesprite = makeTextSprite( this.id, 
		{ fontsize: 32, fontface: "Georgia", borderColor: {r:0, g:0, b:255, a:1.0} } );
		this.namesprite.position.set(0,10,-3);
		this.object.add(this.namesprite);
		this.walk.play();
		
	}
	destroy(){
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

$('#loading').text("Server offline");

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
	$('#loading').text("Connected");
});
	
function render() {
     renderer.render(scene, camera);

	delta = clock.getDelta();
	
	if(loaded){
			
		if(!rezzed){
			if(getParam('nick')){
				p1 = new player(getParam('nick'));
			} else {
				p1 = new player(new Date().valueOf());
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

			$(document).mouseleave(function () {
    			camcontrols.mousein = false;
				console.log('out');
			});
			$(document).mouseenter(function () {
    			camcontrols.mousein = true;
				console.log('in');
			});

			tempworld = objman.getmodel({name:"world.js"});
			scene.add(tempworld);
			rezzed = true;
			socket.emit('join',{id: p1.id});
			
		}
		if(camcontrols){
			camcontrols.update(delta);
			p1.animset();
			p1.animmixer.update(delta);
			manager.animupdate();
			socket.emit('move',{pos: p1.object.position, rot: p1.object.rotation, id: p1.id, state: p1.setstate});
		}	
		
	}
    requestAnimationFrame(render);
}
