var _ = require('underscore');
var util = require('util');
var path = require('path');
var fs = require('fs');
var THREE = require('three');


// These are "null objects" that we use to stock the meshes we use to offset various things from each other.
// we never directly render these objects, so we don't need to care about their appearance.
var MATERIAL = new THREE.MeshBasicMaterial({ color: 0xffffff });
var CUBE = new THREE.CubeGeometry();

var EARTH_TILT = 23;
var DEG_TO_RAD = Math.PI / 180;
var EARTH_ORBIT_RADIUS = 150000000; // ~ 149,598,000 km major axis of earth orbit around center of ellipse

/**
 * This simulation spins the earth around the sun;
 * it has a fixed orbital radius.
 * @param depth {int} the resolution of the planet.
 *
 * @constructor
 */


function Sunlight_Sim() {

    this.planet = new THREE.SphereGeometry(1);
    this.planet_sphere = new THREE.Mesh(this.planet.iso, MATERIAL);

    // displaces the earth relative to the sun
    this.planet_anchor = new THREE.Mesh(CUBE, MATERIAL);
    this.planet_anchor.position.x = EARTH_ORBIT_RADIUS; // an arbitrary distance between sun and earth.

    // tilts the earth relative to the anchor
    var planet_tilt = new THREE.Mesh(CUBE, MATERIAL);
    planet_tilt.rotation.z = EARTH_TILT * DEG_TO_RAD;
    this.planet_anchor.add(planet_tilt);

    planet_tilt.add(this.planet_sphere);

    // the anchor point of the planet anchor, in the sun. -- might be redundant.
    this.sun_center = new THREE.Mesh(CUBE, MATERIAL);
    this.sun_center.add(this.planet_anchor);

    // representing the sun
    this.sun = new THREE.Mesh(CUBE, MATERIAL);
    this.sun.add(this.sun_center);

    // a reference point to determine the
    this.sunlight_vector = new THREE.Mesh(CUBE, MATERIAL); // the origin of the system
}

_.extend(Sunlight_Sim.prototype, {

    init: function(callback){
        this.seb().init(callback);
    },

    rotate_planet: function () {
        var solar_orbit_angle = this.hours * Math.PI * 2 / ( 365 * 24);
        this.planet_sphere.rotation.y = (this.hours % 24) * Math.PI / 12;
        this.sun_center.rotation.y = solar_orbit_angle;
        this.planet_anchor.rotation.y = -solar_orbit_angle;
    },

    /**
     * move the stellar objects based of the time of year
     * @param day {number} a number of days since start of simulation; can be a float.
     * @param hour {number} the time of day(0..24); can be float.
     */
    set_time: function (day, hour) {
        if (!hour) hour = 0;
        this.hours = hour + (day * 24);

        this.rotate_planet();
        this.sun.updateMatrixWorld();
        this.matrix = this.planet_sphere.matrixWorld;
        this.planet_center = new THREE.Vector3().applyProjection(this.planet_sphere.matrixWorld);
    },

    sun_normal: function(){
        return this.sunlight_vector.position.clone().sub(this.planet_center).normalize();
    }

});

module.exports = Sunlight_Sim;
