var GameObject = require('./GameObject');
var twoD = require('./twoD');

var Bullet;
module.exports = Bullet = function (factory, position, direction) {
  GameObject.call(this, factory);
  
  this.position = new twoD.Vector().copy(position);
  this.direction = new twoD.Vector().copy(direction);
  this.speed = 45; // m/s
  
  this.expiringTime;
  this.lifeTime = 2000; // ms
  
};

Bullet.prototype = Object.create(GameObject.prototype);

Bullet.prototype.update = function (delta, now) {
  GameObject.prototype.update.call(this, delta, now);
  
  if (!this.expiringTime) {
    this.expiringTime = now + this.lifeTime;
  } else if (now > this.expiringTime) {
    this.expired = true;
  }
  
  this.position.addSelf(this.direction.normalize().multiplyScalar(delta * this.speed));
};