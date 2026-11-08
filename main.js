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

  // The neck is the parent of the clavicle bridge, so neck movement also
  // carries the clavicles and both shoulder joints with it.
  const neck = makeBone("neck", spine, [0, 0.51, 0]);
  const shoulderBridge = makeBone("shoulderBridge", neck, [0, -0.08, 0], false);
  const head = makeBone("head", neck, [0, 0.19, 0]);

  // Arms: upper arm 0.30, forearm 0.27, hand 0.12.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    // Shorter clavicles bring the shoulder joints closer to the neck,
    // giving the shoulder girdle more natural human proportions.
    const shoulder = makeBone(side + "Shoulder", shoulderBridge, [sign * 0.17, 0, 0]);
    const elbow = makeBone(side + "Elbow", shoulder, [sign * 0.30, -0.015, 0]);
    const wrist = makeBone(side + "Wrist", elbow, [sign * 0.27, -0.005, 0]);
    makeBone(side + "HandEnd", wrist, [sign * 0.12, 0, 0], false);

    // Rest pose: let the arms hang naturally instead of extending sideways.
    // The shoulder rotates around Z to bring the upper arm down alongside
    // the torso; a small elbow bend keeps the arm from looking rigid.
    // Near-vertical resting arms: 1.34 rad is close to straight down.
    shoulder.rotation.z = -sign * 1.34;
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
  let activeAction = null;

  // Normalized keyframes are interpolated smoothly by updateWalk().
  const actionClips = {
    jump: {
      duration: 1.05,
      frames: [
        { at: 0, pose: {} },
        { at: 0.18, pose: { hip: { x: 0.10 }, rootY: 0.02 } },
        { at: 0.48, pose: { rootY: 0.62, hip: { x: -0.08 } } },
        { at: 0.72, pose: { rootY: 0.42, hip: { x: 0.04 } } },
        { at: 1, pose: {} }
      ]
    },
    pickup: {
      duration: 0.9,
      frames: [
        { at: 0, pose: {} },
        // Keep the torso and legs upright; bend both elbows so the forearms
        // and hands point upward together, like a two-pronged pitchfork.
        { at: 0.18, pose: { leftElbow: { z: -0.72 }, rightElbow: { z: 0.72 } } },
        { at: 0.42, pose: { leftElbow: { z: -1.48 }, rightElbow: { z: 1.48 } } },
        { at: 0.72, pose: { leftElbow: { z: -1.48 }, rightElbow: { z: 1.48 } } },
        { at: 1, pose: {} }
      ]
    },
    punch: {
      duration: 1.2,
      loop: true,
      frames: [
        { at: 0, pose: {} },
        // Right fist first: pull sideways, drive forward, retract.
        { at: 0.10, pose: { rightShoulder: { z: -1.08, x: 0.02 }, rightElbow: { x: -0.78 } } },
        { at: 0.25, pose: { rightShoulder: { z: -1.34, x: -0.92 }, rightElbow: { x: -0.08 } } },
        { at: 0.39, pose: { rightShoulder: { x: -0.30 }, rightElbow: { x: -0.58 } } },
        // Then the left fist performs the same sideways-to-forward motion.
        { at: 0.52, pose: { leftShoulder: { z: 1.08, x: 0.02 }, leftElbow: { x: -0.78 } } },
        { at: 0.68, pose: { leftShoulder: { z: 1.34, x: -0.92 }, leftElbow: { x: -0.08 } } },
        { at: 0.82, pose: { leftShoulder: { x: -0.30 }, leftElbow: { x: -0.58 } } },
        { at: 1, pose: {} }
      ]
    }
  };

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
    playAnimation(name) {
      if (!actionClips[name]) {
        console.warn("Unknown rig animation:", name);
        return false;
      }
      rig.resetPose();
      activeAction = { name, startedAt: null };
      walking = false;
      return true;
    },
    stopAnimation() {
      activeAction = null;
      rig.resetPose();
    },
    updateWalk(timeSeconds) {
      if (activeAction) {
        const clip = actionClips[activeAction.name];
        if (activeAction.startedAt === null) activeAction.startedAt = timeSeconds;
        const elapsed = Math.max(0, timeSeconds - activeAction.startedAt);
        const t = clip.loop
          ? (elapsed % clip.duration) / clip.duration
          : Math.min(1, elapsed / clip.duration);
        let index = 0;
        while (index < clip.frames.length - 2 && t > clip.frames[index + 1].at) index++;
        const a = clip.frames[index];
        const b = clip.frames[Math.min(index + 1, clip.frames.length - 1)];
        const span = Math.max(0.0001, b.at - a.at);
        const f = THREE.MathUtils.clamp((t - a.at) / span, 0, 1);
        const eased = f * f * (3 - 2 * f);
        const keys = new Set([...Object.keys(a.pose), ...Object.keys(b.pose)]);
        for (const key of keys) {
          if (key === "rootY") {
            root.position.y = THREE.MathUtils.lerp(a.pose.rootY || 0, b.pose.rootY || 0, eased);
            continue;
          }
          const joint = joints[key];
          if (!joint) continue;
          const av = a.pose[key] || {};
          const bv = b.pose[key] || {};
          for (const axis of ["x", "y", "z"]) {
            if (av[axis] !== undefined || bv[axis] !== undefined) {
              const rest = initialRotations.get(joint)?.[axis] ?? 0;
              const from = av[axis] !== undefined ? av[axis] : rest;
              const to = bv[axis] !== undefined ? bv[axis] : rest;
              joint.rotation[axis] = THREE.MathUtils.lerp(from, to, eased);
            }
          }
        }
        // Jump keeps the ordinary walk gait running underneath the vertical
        // root arc, rather than freezing the arms and legs in a separate pose.
        if (activeAction.name === "jump") {
          const cycle = timeSeconds * speed * Math.PI * 2;
          for (const [side, phase] of [["left", cycle], ["right", cycle + Math.PI]]) {
            const swing = Math.sin(phase);
            const recovery = Math.max(0, Math.cos(phase));
            const thigh = joints[side + "Thigh"];
            const knee = joints[side + "Knee"];
            const shoulder = joints[side + "Shoulder"];
            const elbow = joints[side + "Elbow"];
            thigh.rotation.x = (initialRotations.get(thigh)?.x || 0) + swing * 0.62 * amplitude;
            knee.rotation.x = (initialRotations.get(knee)?.x || 0) + recovery * 0.52 * amplitude;
            shoulder.rotation.x = (initialRotations.get(shoulder)?.x || 0) - swing * 0.32 * amplitude;
            elbow.rotation.x = (initialRotations.get(elbow)?.x || 0) - (0.12 + recovery * 0.20) * amplitude;
          }
        }

        if (!clip.loop && t >= 1) {
          activeAction = null;
          rig.resetPose();
          walking = true;
        }
        return;
      }
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

      // Arms counter-swing against the legs. The arms hang down in their
      // rest pose, so their pendulum motion must rotate around the body's
      // lateral (world X) axis. Rotating around the old Y axis made them
      // sweep sideways, which looked unlike a natural walk.
      const worldX = new THREE.Vector3(1, 0, 0);
      const worldSwing = new THREE.Quaternion();
      const parentWorldInverse = new THREE.Quaternion();
      const localDelta = new THREE.Quaternion();

      const applyWorldXSwing = (bone, restRotation, angle) => {
        bone.parent.updateWorldMatrix(true, false);
        bone.parent.getWorldQuaternion(parentWorldInverse).invert();
        worldSwing.setFromAxisAngle(worldX, angle);
        // Convert the desired world-space hinge rotation into the bone's
        // parent-local space, preserving its authored resting orientation.
        localDelta.copy(parentWorldInverse)
          .multiply(worldSwing)
          .multiply(bone.parent.getWorldQuaternion(new THREE.Quaternion()));
        const restQuaternion = new THREE.Quaternion().setFromEuler(restRotation);
        bone.quaternion.copy(localDelta).multiply(restQuaternion);
      };

      for (const [side, legPhase] of [["left", leftPhase], ["right", rightPhase]]) {
        const armPhase = legPhase + Math.PI;
        const armSwing = Math.sin(armPhase);
        const shoulder = joints[side + "Shoulder"];
        const elbow = joints[side + "Elbow"];
        const shoulderRest = initialRotations.get(shoulder);
        const elbowRest = initialRotations.get(elbow);

        // Shoulder controls the whole arm's forward/backward pendulum.
        applyWorldXSwing(shoulder, shoulderRest, armSwing * 0.48 * amplitude);

        // The elbow hinges in the same forward-swing phase. Its flex changes
        // gradually through the cycle, so the forearm follows the upper arm
        // instead of looking like one rigid piece.
        const elbowFlex = (0.12 + (0.5 + 0.5 * armSwing) * 0.34) * amplitude;
        // Negative X rotation bends the forearm toward the character's
        // front (+Z); positive rotation was folding it behind the body.
        applyWorldXSwing(elbow, elbowRest, -elbowFlex);
      }

      // Subtle torso counter-rotation; keep the body at a constant height.
      joints.hip.rotation.y = Math.sin(cycle) * 0.035 * amplitude;
      joints.spine.rotation.y = -Math.sin(cycle) * 0.025 * amplitude;
      root.position.y = 0;
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });

// Export the current rendered view as a PNG when the photo button is pressed.
const captureButton = document.querySelector("#capture-photo");
captureButton.addEventListener("click", () => {
  renderer.render(scene, camera);
  canvas.toBlob(blob => {
    if (!blob) {
      console.error("Could not capture the scene image.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ben-scene-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
});
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

// Load Ben's character mesh and attach it to the articulated rig.
let humanRig = null;
let benCharacter = null;
import("./ben.js").then(({ createBen }) => {
  benCharacter = createBen({ createHumanRig });
  humanRig = benCharacter.rig;
  scene.add(benCharacter.group);
  window.ben = benCharacter;
  window.humanRig = humanRig;
  const controlsPanel = document.querySelector("#rig-controls");
  controlsPanel.addEventListener("click", event => {
    const button = event.target.closest("button[data-animation]");
    if (!button || !humanRig) return;
    const animation = button.dataset.animation;
    if (animation === "walk") {
      humanRig.stopAnimation();
      humanRig.setWalking(true);
      controlsPanel.querySelectorAll("button").forEach(item => {
        item.setAttribute("aria-pressed", String(item === button));
      });
    } else {
      humanRig.playAnimation(animation);
      controlsPanel.querySelectorAll("button").forEach(item => {
        item.setAttribute("aria-pressed", String(item === button));
      });
    }
  });
}).catch(error => {
  console.error("Could not load Ben character:", error);
});

const clock = new THREE.Clock();

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

renderer.setAnimationLoop(() => {
  const elapsed = clock.getElapsedTime();
  if (humanRig) humanRig.updateWalk(elapsed);
  controls.update();
  renderer.render(scene, camera);
});

