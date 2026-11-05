// The game: the town, Inaara, the people, the camera that follows her, and what happens every frame.
import * as THREE from '../vendor/three/three.js';
import { buildTown, BOUND, inside } from './layout.js';
import { World, Walker, cameraReach } from './move.js';
import { buildTown3D } from './town3d.js';
import { Hero } from './hero.js';
import { People } from './people.js';
import { Sky } from './sky.js';

export const CAMERA = { dist: 4.4, min: 2.2, max: 9, pitch: 0.28, height: 0.95 };

export class Game {
  constructor(renderer, assets, input, save, { quality = 'high' } = {}) {
    this.renderer = renderer;
    this.assets = assets;
    this.input = input;
    this.save = save;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 600);
    this.plan = buildTown();
    this.world = new World(this.plan.solids, BOUND);
    this.roofs = new World(this.plan.camera);
    this.town = buildTown3D(this.plan, assets, this.scene, { quality });
    this.sky = new Sky(renderer, this.scene, assets, { shadowSize: quality === 'low' ? 1024 : 2048 });
    this.sky.set(save.settings.time, this.town.glow);
    this.hero = new Hero(assets);
    this.scene.add(this.hero.root);
    this.walker = new Walker(this.plan.start.x, this.plan.start.z, this.plan.start.heading);
    this.people = new People(this.plan, this.world, this.scene);
    this.world.dynamic = this.people.solids;
    this.yaw = this.plan.start.heading + Math.PI;
    this.pitch = CAMERA.pitch;
    this.dist = CAMERA.dist;
    this.camPos = new THREE.Vector3();
    this.screen = 'title'; // title, play, paused
    this.area = '';
    this.onArea = () => {};
    this.t = 0;
    this.hero.update(0, this.walker);
    this.placeCamera(0, true);
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setTime(time) {
    this.save.settings.time = time;
    this.sky.set(time, this.town.glow);
  }

  frame(dt) {
    this.t += dt;
    const ctl = this.input.take();
    if (this.screen === 'play') {
      // Turning the camera.
      const sp = 0.0042 * (this.save.settings.camSpeed || 1);
      this.yaw -= ctl.look.x * sp;
      this.pitch = Math.max(-0.35, Math.min(1.25, this.pitch + ctl.look.y * sp * (this.save.settings.invertY ? -1 : 1)));
      this.dist = Math.max(CAMERA.min, Math.min(CAMERA.max, this.dist * (1 + ctl.zoom * 0.1)));
      // Moving: the stick's forward is away from the camera.
      const m = this.input.move();
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const move = { x: fx * m.y + Math.cos(this.yaw) * m.x, z: fz * m.y - Math.sin(this.yaw) * m.x };
      // Long steps (a slow frame) are split so she never goes through a wall.
      const steps = Math.ceil(dt / (1 / 60));
      for (let i = 0; i < steps; i++) this.walker.update(dt / steps, this.world, move, m.run, ctl.jump && i === 0);
      // When she walks and the camera hasn't been turned by hand for a moment, it swings round behind her.
      const sinceLook = (performance.now() - this.input.lastLook) / 1000;
      const speed = Math.hypot(this.walker.vx, this.walker.vz);
      if (sinceLook > 1.5 && speed > 0.5 && Math.abs(m.y) > 0.2) {
        const want = this.walker.heading + Math.PI;
        let d = want - this.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.yaw += d * Math.min(1, dt * 0.9 * Math.min(1, speed / 3));
      }
      this.checkArea();
    } else if (this.screen === 'title') {
      // A slow look round the junction behind the title.
      this.yaw += dt * 0.06;
    }
    const near = this.people.update(this.screen === 'paused' ? 0 : dt, this.walker);
    this.hero.update(this.screen === 'paused' ? 0 : dt, this.walker, { nearPerson: near, camera: this.camera.position });
    this.placeCamera(dt);
    this.sky.follow(this.walker.x, this.walker.y, this.walker.z, dt, this.town.lamps);
    this.renderer.render(this.scene, this.camera);
  }

  placeCamera(dt, snap = false) {
    const w = this.walker;
    const target = new THREE.Vector3(w.x, w.y + CAMERA.height, w.z);
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    const reach = cameraReach(this.world, this.roofs, target, dir, this.dist);
    const want = target.clone().addScaledVector(dir, reach);
    want.y = Math.max(want.y, 0.3);
    if (snap || !this.camReady) {
      this.camPos.copy(want);
      this.camReady = true;
    } else {
      // Smooth, but come in quickly when something gets in the way.
      const k = 1 - Math.exp(-dt * (this.camPos.distanceTo(target) > reach + 0.2 ? 20 : 10));
      this.camPos.lerp(want, k);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(target.x, target.y + 0.15, target.z);
  }

  checkArea() {
    const w = this.walker;
    const a = this.plan.areas.find(a => inside(a, w.x, w.z));
    const name = a ? a.name : '';
    if (name && name !== this.area) {
      this.area = name;
      this.onArea(name);
    }
  }

  /** For the tests: put her somewhere. */
  teleport(x, z, heading = this.walker.heading) {
    this.walker = new Walker(x, z, heading);
    this.walker.y = this.world.groundAt(x, z, 1);
    this.yaw = heading + Math.PI;
    this.camReady = false;
  }
}
