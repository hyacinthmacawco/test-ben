import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Build an articulated humanoid pivot rig with a procedural walk cycle.
 *
 * Main joints: hip, neck, two shoulders, two elbows, and two knees.
 * The clavicle bar sits directly below the neck and connects both shoulders.
 */
export function createHumanRig(options = {}) {
  const {
    boneColor = 0x8bb8e8,
    jointColor = 0xf0bd72,
    boneRadius = 0.045,
    jointRadius = 0.065,
    walkSpeed = 1.8,
    walkAmplitude = 1
  } = options;

  const root = new THREE.Group();
  root.name = "HumanRig";

  const joints = {};
  const bones = [];

  const makeBone = (name, parent, position, exposeAsJoint = true) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(position[0], position[1], position[2]);
    if (parent) parent.add(bone);
    else root.add(bone);
    if (exposeAsJoint) joints[name] = bone;
    bones.push(bone);
    return bone;
  };

  const hip = makeBone("hip", null, [0, 0.98, 0]);
  const spine = makeBone("spine", hip, [0, 0.30, 0]);

  // A clavicle/shoulder bridge directly below the neck.
  const shoulderBridge = makeBone("shoulderBridge", spine, [0, 0.43, 0], false);
  const neck = makeBone("neck", spine, [0, 0.51, 0]);
  const head = makeBone("head", neck, [0, 0.19, 0]);

  // Arms: upper arm 0.30, forearm 0.27, hand 0.12.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = makeBone(side + "Shoulder", shoulderBridge, [sign * 0.22, 0, 0]);
    const elbow = makeBone(side + "Elbow", shoulder, [sign * 0.30, -0.015, 0]);
    const wrist = makeBone(side + "Wrist", elbow, [sign * 0.27, -0.005, 0]);
    makeBone(side + "HandEnd", wrist, [sign * 0.12, 0, 0], false);

    // Rest pose: let the arms hang naturally instead of extending sideways.
    // The shoulder rotates around Z to bring the upper arm down alongside
    // the torso; a small elbow bend keeps the arm from looking rigid.
    shoulder.rotation.z = -sign * 0.88;
    elbow.rotation.z = -sign * 0.12;
  }

  // Legs: thigh 0.43, lower leg 0.43, ankle extension 0.12.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const thigh = makeBone(side + "Thigh", hip, [sign * 0.105, -0.06, 0]);
    const knee = makeBone(side + "Knee", thigh, [0, -0.43, 0]);
    makeBone(side + "Ankle", knee, [0, -0.43, 0]);
  }

  const skeleton = new THREE.Skeleton(bones);
  root.updateMatrixWorld(true);

  const boneMaterial = new THREE.MeshStandardMaterial({
    color: boneColor, roughness: 0.62, metalness: 0.08
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: jointColor, roughness: 0.42, metalness: 0.12
  });
  const jointGeometry = new THREE.SphereGeometry(jointRadius, 18, 14);
  const segmentGeometry = new THREE.CylinderGeometry(boneRadius * 0.82, boneRadius, 1, 12);

  for (const bone of bones) {
    if (bone.name !== "shoulderBridge" && bone.name !== "HandEnd") {
      const marker = new THREE.Mesh(jointGeometry, jointMaterial);
      marker.name = bone.name + "Marker";
      bone.add(marker);
    }

    for (const child of bone.children) {
      if (!child.isBone) continue;
      const direction = child.position.clone();
      const length = direction.length();
      if (length < 0.0001) continue;

      const segment = new THREE.Mesh(segmentGeometry, boneMaterial);
      segment.name = bone.name + "To" + child.name;
      segment.position.copy(direction).multiplyScalar(0.5);
      segment.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.clone().normalize()
      );
      segment.scale.y = length;
      bone.add(segment);
    }
  }

  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 22, 18),
    new THREE.MeshStandardMaterial({ color: 0xd5dfeb, roughness: 0.7 })
  );
  headMesh.position.y = 0.09;
  head.add(headMesh);

  const initialRotations = new Map(
    bones.map(bone => [bone, bone.rotation.clone()])
  );

  let walking = true;
  let speed = walkSpeed;
  let amplitude = walkAmplitude;

  const rig = {
    group: root,
    skeleton,
    bones,
    joints,
    get walking() { return walking; },
    setWalking(enabled) {
      walking = Boolean(enabled);
      if (!walking) {
        rig.resetPose();
        root.position.y = 0;
      }
    },
    setWalkSpeed(value) {
      speed = Math.max(0, Number(value) || 0);
    },
    updateWalk(timeSeconds) {
      if (!walking) return;

      const cycle = timeSeconds * speed * Math.PI * 2;
      const stride = 0.62 * amplitude;
      const leftPhase = cycle;
      const rightPhase = cycle + Math.PI;

      // The rig's forward/backward axis is Z, so limbs swing around local X.
      // Opposite phases keep the legs alternating like a real gait.
      for (const [side, phase] of [["left", leftPhase], ["right", rightPhase]]) {
        const swing = Math.sin(phase);
        const recovery = Math.max(0, Math.cos(phase));
        joints[side + "Thigh"].rotation.x = swing * stride;
        joints[side + "Knee"].rotation.x = recovery * 0.78 * amplitude;
      }

      // Swing the arms from the shoulder joints, opposite to the legs.
      // The Z rotation above keeps the arms naturally lowered; Y adds the
      // forward/backward pendulum motion without returning them to a T-pose.
      for (const [side, phase] of [["left", leftPhase], ["right", rightPhase]]) {
        const sideSign = side === "left" ? -1 : 1;
        const armSwing = Math.sin(phase);

        // Shoulder drives the main pendulum swing; the elbow adds a gentle,
        // continuously varying flex so the forearm follows through smoothly.
        joints[side + "Shoulder"].rotation.y =
          sideSign * armSwing * 0.58 * amplitude;
        // Keep a clear baseline bend and flex further as the arm swings
        // forward. The larger range makes the elbow articulation visible.
        const elbowFlex = 0.38 + (0.5 + 0.5 * Math.cos(phase)) * 0.42 * amplitude;
        joints[side + "Elbow"].rotation.z = -sideSign * elbowFlex;
      }

      // Small torso counter-rotation and vertical gait bounce.
      joints.hip.rotation.y = Math.sin(cycle) * 0.035 * amplitude;
      joints.spine.rotation.y = -Math.sin(cycle) * 0.025 * amplitude;
      root.position.y = Math.abs(Math.sin(cycle * 2)) * 0.045 * amplitude;
    },
    resetPose() {
      for (const [bone, rotation] of initialRotations) {
        bone.rotation.copy(rotation);
      }
      root.position.y = 0;
    },
    setPose(pose = {}) {
      for (const [name, rotation] of Object.entries(pose)) {
        const joint = joints[name];
        if (!joint || !rotation) continue;
        if (rotation.x !== undefined) joint.rotation.x = rotation.x;
        if (rotation.y !== undefined) joint.rotation.y = rotation.y;
        if (rotation.z !== undefined) joint.rotation.z = rotation.z;
      }
    }
  };

  return rig;
}

// Demo scene
const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10151d);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3.4, 2.4, 5.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xdceaff, 0x263044, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(3, 5, 4);
keyLight.castShadow = true;
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 12),
  new THREE.MeshStandardMaterial({ color: 0x202a38, roughness: 0.92 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0.02;
floor.receiveShadow = true;
scene.add(floor);
scene.add(new THREE.GridHelper(12, 24, 0x53657b, 0x354354));

export const humanRig = createHumanRig();
scene.add(humanRig.group);

const clock = new THREE.Clock();

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  humanRig.updateWalk(elapsed);
  controls.update();
  renderer.render(scene, camera);
});

window.humanRig = humanRig;
