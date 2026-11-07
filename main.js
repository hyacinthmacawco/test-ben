import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Build a simple articulated humanoid skeleton.
 *
 * Joint layout:
 *   1 hip (pelvis/root), 1 neck, 2 shoulders, 2 elbows, 2 knees.
 *
 * The returned rig exposes THREE.Bone objects in `rig.joints`.
 * Rotate a joint locally to pose it, e.g.:
 *   rig.joints.leftElbow.rotation.z = -0.8;
 */
export function createHumanRig(options = {}) {
  const {
    boneColor = 0x8bb8e8,
    jointColor = 0xf0bd72,
    boneRadius = 0.055,
    jointRadius = 0.085
  } = options;

  const root = new THREE.Group();
  root.name = "HumanRig";

  const joints = {};
  const bones = [];

  const makeBone = (name, parent, position) => {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(position[0], position[1], position[2]);
    if (parent) parent.add(bone);
    else root.add(bone);
    joints[name] = bone;
    bones.push(bone);
    return bone;
  };

  // Central chain. The hip is the single root/pelvis joint.
  const hip = makeBone("hip", null, [0, 1.05, 0]);
  const spine = makeBone("spine", hip, [0, 0.28, 0]);
  const neck = makeBone("neck", spine, [0, 0.57, 0]);
  const head = makeBone("head", neck, [0, 0.22, 0]);

  // Arms: shoulder -> elbow -> wrist/end.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = makeBone(side + "Shoulder", spine, [sign * 0.29, 0.48, 0]);
    const elbow = makeBone(side + "Elbow", shoulder, [sign * 0.39, -0.02, 0]);
    makeBone(side + "Wrist", elbow, [sign * 0.34, -0.015, 0]);
  }

  // Legs: hip branches into two upper legs, each with one knee.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const thigh = makeBone(side + "Thigh", hip, [sign * 0.14, -0.08, 0]);
    const knee = makeBone(side + "Knee", thigh, [0, -0.48, 0]);
    makeBone(side + "Ankle", knee, [0, -0.48, 0]);
  }

  const skeleton = new THREE.Skeleton(bones);
  root.updateMatrixWorld(true);

  // Build visual segments between each bone and its direct children.
  const boneMaterial = new THREE.MeshStandardMaterial({
    color: boneColor, roughness: 0.62, metalness: 0.08
  });
  const jointMaterial = new THREE.MeshStandardMaterial({
    color: jointColor, roughness: 0.42, metalness: 0.12
  });
  const jointGeometry = new THREE.SphereGeometry(jointRadius, 18, 14);
  const segmentGeometry = new THREE.CylinderGeometry(boneRadius * 0.82, boneRadius, 1, 12);

  for (const bone of bones) {
    const marker = new THREE.Mesh(jointGeometry, jointMaterial);
    marker.name = bone.name + "Marker";
    marker.position.set(0, 0, 0);
    bone.add(marker);

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

  // A slightly larger head marker makes the neck/head orientation obvious.
  const headMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 22, 18),
    new THREE.MeshStandardMaterial({ color: 0xd5dfeb, roughness: 0.7 })
  );
  headMesh.position.y = 0.10;
  head.add(headMesh);

  const initialRotations = new Map(
    bones.map(bone => [bone, bone.rotation.clone()])
  );

  return {
    group: root,
    skeleton,
    bones,
    joints,
    resetPose() {
      for (const [bone, rotation] of initialRotations) {
        bone.rotation.copy(rotation);
      }
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
camera.position.set(3.4, 2.6, 5.5);

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

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// Expose the rig for quick experimentation in the browser console.
window.humanRig = humanRig;
