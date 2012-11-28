var game = game || {};

// describes a player in the field
game.Player = (function() {
  
  var angleThreshold = Math.cos(3 * Math.PI / 8);
  
  var Player = function (cfg) {
    
    // generate a random id for now
    this.id = Math.floor(Math.random() * 0xffff);
    
    // Player speed
    this.speed = 12; // m/s
    
    // Current position
    this.position = cfg.position || new THREE.Vector2(0, 0);
    
    // Direction the player is moving to (normalized)
    this.walkDir = new THREE.Vector2(0, 0);
    
    // Direction the player is looking at (normalized)
    this.lookDir = new THREE.Vector2(1, 0);
    
    // radius for a bounding circle for collision detection
    this.boundingRadius = 0.5;
    
    
    if (cfg.color === undefined) {
      cfg.color = 0xCC0000;
    }
    var material = new THREE.MeshPhongMaterial({ color: cfg.color });
    var shape = new THREE.Shape();
    shape.fromPoints([
      new THREE.Vector3(1, 0, 0), 
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(-0.5, 0.5, 0)
    ]);  
    this.mesh = new THREE.Mesh(shape.extrude({amount: 1, bevelEnabled: false}), material);
    
    this.mesh.position.set(this.position.x, this.position.y, 0.5);
    
  };
  
  // Update player state with a timeframe of delta
  Player.prototype.update = function(delta, world) {
    // update position
    distance = this.speed * delta;
    var track = this.walkDir.normalize().multiplyScalar(distance);
    var altTrack = this.moveAndCollide(track, world);
    this.moveAndCollide(altTrack, world); 
    
    var angle = game.utils.angleBetweenVector2(new THREE.Vector2(1, 0), this.lookDir);  
    
    // update mesh
    this.mesh.position.set(this.position.x, this.position.y, 0.5);
    this.mesh.rotation.set(0, 0, angle);  
  };
  
  // try to move the player along track
  // returns an alternative
  Player.prototype.moveAndCollide = function (track, world) {
    // TODO(Jan): Cleanup
    
    // threshold for movement to avoid getting stuck in the wall (between [0, 1])
    var threshold = 0.01;
    
    // alternative track for the player
    var altTrack = new THREE.Vector2(0, 0);
    
    // temporary alternative track for intermediate calculations
    var tmpAltTrack = new THREE.Vector2(0, 0);
    
    // fraction of distance to travel
    var s = 1;
    
    // calculate bounding box for the moving player
    var movementBounds = new THREE.Rectangle();
    movementBounds.addPoint(this.position.x, this.position.y);
    movementBounds.addPoint(this.position.x + track.x, this.position.y + track.y);
    movementBounds.inflate(this.boundingRadius);
    
    // bounding box for objects to collide with
    var objectBounds = new THREE.Rectangle();
    
    // collide with walls
    for (var i = 0; i < world.walls.length; i++) {      
      var wall = world.walls[i];    
      
      // quickly test bounding boxes to avoid extra calculations
      if (!wall.bounds.intersects(movementBounds)) {
        // early out
        continue;
      }
        
           
      var objCount = wall.corners.length;
      for (var j = 0; j < objCount; j++) {
        // current wall: (p1, p2)
        var p1 = wall.corners[j];
        var p2 = wall.corners[(j + 1) % objCount];
        
        // quickly test bounding boxes to avoid extra calculations
        objectBounds.empty();
        objectBounds.addPoint(p1.x, p1.y);
        objectBounds.addPoint(p2.x, p2.y);        
        if (!objectBounds.intersects(movementBounds)) {
          // early out
          continue;
        }
        
        // calculate the collision
        //var sWall = game.dynamics.collidePointLine(this.position, track, p1, p2, tmpAltTrack);
        var wallVector = new THREE.Vector2().sub(p2, p1);
        var sWall = game.dynamics.collideCirclePolySegment(
          this.position, 
          this.boundingRadius, 
          track, p1, wallVector, tmpAltTrack);
        
        if (sWall !== undefined) {
          // We have a collision
          
          // apply threshold
          sWall = Math.max(sWall - threshold, 0);
          
          if (sWall < s) {
            // Collision is closer on the track than previous collisions          
            s = sWall;
            altTrack.copy(tmpAltTrack);
          }
        }
      }
    }
    
    // collide with enemies
    for (var i = 0; i < world.enemies.length; i++) {
      var enemy = world.enemies[i];
      
      objectBounds.empty();
      objectBounds.addPoint(enemy.position.x - enemy.boundingRadius, enemy.position.y - enemy.boundingRadius);
      objectBounds.addPoint(enemy.position.x + enemy.boundingRadius, enemy.position.y + enemy.boundingRadius);
      
      // quickly test bounding boxes to avoid extra calculations
      if (!objectBounds.intersects(movementBounds)) {
        // early out
        continue;
      }
      
      var sEnemy = game.dynamics.collideCircleCircle(this.position, this.boundingRadius, track, enemy.position, enemy.boundingRadius, tmpAltTrack);
      if (sEnemy !== undefined) {
        // We have a collision
        
        // apply threshold
        sEnemy = Math.max(sEnemy - threshold, 0);
        
        if (sEnemy < s) {
          // Collision is closer on the track than previous collisions          
          s = sEnemy;
          altTrack.copy(tmpAltTrack);
        }
      }
    }
    
    // move the player
    this.position.addSelf(track.multiplyScalar(s));
    
    return altTrack;
  };
  
  Player.prototype.shoot = function (world) {
    world.addBullet(this.position.clone(), this.lookDir.clone());
  };
  
  return Player;
  
})();
