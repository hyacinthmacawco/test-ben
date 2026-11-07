import * as THREE from "three";

/**
 * Build a stylized, game-ready Ben model and attach its visible parts to the
 * procedural humanoid rig. All limbs are children of their matching joints,
 * so the existing shoulder, elbow, hip and knee animation drives the model.
 */
export function createBen({ createHumanRig }) {
  if (typeof createHumanRig !== "function") {
    throw new TypeError("createBen requires the createHumanRig rig factory.");
  }

  const rig = createHumanRig();
  const { group, joints } = rig;
  group.name = "Ben10Character";

  // Hide the rig's diagnostic cylinders and joint markers; retain the bones.
  group.traverse(object => {
    if (object.isMesh) object.visible = false;
  });

  const materials = {
    skin: new THREE.MeshStandardMaterial({ color: 0xd99a82, roughness: 0.88 }),
    skinLight: new THREE.MeshStandardMaterial({ color: 0xe9b09a, roughness: 0.9 }),
    hair: new THREE.MeshStandardMaterial({ color: 0x38231d, roughness: 0.95 }),
    hairLight: new THREE.MeshStandardMaterial({ color: 0x543025, roughness: 0.95 }),
    shirtBlack: new THREE.MeshStandardMaterial({ color: 0x111714, roughness: 0.92 }),
    green: new THREE.MeshStandardMaterial({ color: 0x079b4c, roughness: 0.82 }),
    greenDark: new THREE.MeshStandardMaterial({ color: 0x075d32, roughness: 0.9 }),
    pants: new THREE.MeshStandardMaterial({ color: 0x704329, roughness: 0.95 }),
    pantsDark: new THREE.MeshStandardMaterial({ color: 0x4d2e20, roughness: 0.95 }),
    shoeWhite: new THREE.MeshStandardMaterial({ color: 0xe5e8df, roughness: 0.8 }),
    shoeGreen: new THREE.MeshStandardMaterial({ color: 0x078c48, roughness: 0.82 }),
    sole: new THREE.MeshStandardMaterial({ color: 0x252a28, roughness: 0.95 }),
    eyeWhite: new THREE.MeshStandardMaterial({ color: 0xf4eee3, roughness: 0.65 }),
    iris: new THREE.MeshStandardMaterial({ color: 0x159b50, roughness: 0.55 }),
    pupil: new THREE.MeshStandardMaterial({ color: 0x101410, roughness: 0.5 }),
    outline: new THREE.MeshStandardMaterial({ color: 0x241914, roughness: 1 })
  };

  const add = (parent, geometry, material, position, scale, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (scale) mesh.scale.set(...scale);
    if (name) mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const sphere = (parent, material, position, scale, name) =>
    add(parent, new THREE.SphereGeometry(1, 24, 18), material, position, scale, name);

  const capsule = (parent, material, start, end, radius, name) => {
    const a = new THREE.Vector3(...start);
    const b = new THREE.Vector3(...end);
    const delta = b.clone().sub(a);
    const length = delta.length();
    const mesh = add(
      parent,
      new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 0.25), 5, 12),
      material,
      a.clone().add(b).multiplyScalar(0.5).toArray(),
      null,
      name
    );
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  };

  // Torso: the spine joint carries the shirt and its front details.
  const spine = joints.spine;
  sphere(spine, materials.shirtBlack, [0, 0.12, 0], [0.315, 0.405, 0.19], "BenShirtTorso");
  add(spine, new THREE.BoxGeometry(0.115, 0.76, 0.018), materials.green,
    [0, 0.105, 0.184], null, "GreenCenterStripe");
  add(spine, new THREE.BoxGeometry(0.12, 0.18, 0.022), materials.green,
    [0, 0.415, 0.17], null, "GreenCollar");
  // Green side accents at the shoulder line.
  for (const side of ["left", "right"]) {
    const s = side === "left" ? -1 : 1;
    capsule(spine, materials.greenDark, [s * 0.19, 0.39, 0.015], [s * 0.29, 0.27, 0.02], 0.055, side + "ShoulderAccent");
  }

  // A small canvas texture keeps the iconic 10 readable from the front.
  const numberCanvas = document.createElement("canvas");
  numberCanvas.width = 256;
  numberCanvas.height = 160;
  const ctx = numberCanvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 160);
  ctx.font = "900 112px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#f1f0e7";
  ctx.lineWidth = 15;
  ctx.strokeText("10", 128, 82);
  ctx.fillStyle = "#168b4c";
  ctx.fillText("10", 128, 82);
  const numberTexture = new THREE.CanvasTexture(numberCanvas);
  numberTexture.colorSpace = THREE.SRGBColorSpace;
  const number = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.19),
    new THREE.MeshBasicMaterial({ map: numberTexture, transparent: true, side: THREE.DoubleSide })
  );
  number.position.set(0, 0.09, 0.198);
  spine.add(number);

  // Neck and head.
  sphere(joints.neck, materials.skin, [0, 0.055, 0], [0.105, 0.22, 0.105], "BenNeck");
  const head = joints.head;
  sphere(head, materials.skin, [0, 0.075, 0.015], [0.225, 0.285, 0.19], "BenHead");
  // Keep the lower face subtle; a large protruding muzzle made the head
  // read like a snout instead of Ben's flatter cartoon face.
  sphere(head, materials.skinLight, [0, -0.045, 0.168], [0.125, 0.068, 0.035], "BenMuzzle");

  // Face details face +Z. Keep the eyes forward of the face surface and
  // below the fringe so they remain clearly visible from the front.
  for (const side of ["left", "right"]) {
    const s = side === "left" ? -1 : 1;
    sphere(head, materials.skin, [s * 0.218, 0.055, 0.005], [0.052, 0.085, 0.045], side + "Ear");

    // Slightly wider, taller eye shapes give Ben a readable animated look.
    sphere(head, materials.eyeWhite, [s * 0.087, 0.105, 0.191], [0.071, 0.047, 0.027], side + "EyeWhite");
    sphere(head, materials.iris, [s * 0.080, 0.103, 0.215], [0.034, 0.036, 0.014], side + "Iris");
    sphere(head, materials.pupil, [s * 0.078, 0.103, 0.226], [0.016, 0.026, 0.009], side + "Pupil");
    sphere(head, materials.eyeWhite, [s * 0.068, 0.119, 0.233], [0.009, 0.010, 0.006], side + "EyeHighlight");

    const brow = capsule(head, materials.hair, [s * 0.15, 0.176, 0.195], [s * 0.035, 0.188, 0.207], 0.018, side + "Eyebrow");
    brow.rotation.z += s * -0.08;
  }

  // Small, integrated nose and a curved smile rather than the previous
  // protruding nose + straight line, which looked like a muzzle.
  sphere(head, materials.skinLight, [0, 0.025, 0.218], [0.022, 0.038, 0.027], "Nose");
  const smileCurve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(-0.095, -0.075, 0.196),
    new THREE.Vector3(-0.035, -0.112, 0.218),
    new THREE.Vector3(0.035, -0.112, 0.218),
    new THREE.Vector3(0.095, -0.075, 0.196)
  );
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(smileCurve, 20, 0.006, 7, false), materials.outline
  );
  smile.name = "BenSmile";
  head.add(smile);

  // Hair cap sits higher, exposing the forehead and eyes. A single sculpted
  // zig-zag fringe replaces the row of oversized round locks that obscured
  // the entire upper half of the face.
  sphere(head, materials.hair, [0, 0.285, -0.005], [0.235, 0.105, 0.195], "HairCap");

  const fringeShape = new THREE.Shape();
  fringeShape.moveTo(-0.205, 0.255);
  fringeShape.quadraticCurveTo(-0.13, 0.225, -0.105, 0.185);
  fringeShape.lineTo(-0.055, 0.225);
  fringeShape.lineTo(-0.018, 0.178);
  fringeShape.lineTo(0.025, 0.232);
  fringeShape.lineTo(0.075, 0.183);
  fringeShape.lineTo(0.12, 0.228);
  fringeShape.quadraticCurveTo(0.17, 0.238, 0.205, 0.265);
  fringeShape.lineTo(0.19, 0.305);
  fringeShape.lineTo(-0.19, 0.305);
  fringeShape.closePath();
  const fringeGeometry = new THREE.ExtrudeGeometry(fringeShape, {
    depth: 0.035, bevelEnabled: true, bevelSegments: 2,
    steps: 1, bevelSize: 0.006, bevelThickness: 0.006
  });
  const fringe = new THREE.Mesh(fringeGeometry, materials.hair);
  fringe.position.z = 0.155;
  fringe.name = "SweptHairFringe";
  fringe.castShadow = true;
  head.add(fringe);

  // Side locks and back hair complete the silhouette without covering the eyes.
  const leftLock = sphere(head, materials.hair, [-0.19, 0.105, 0.045], [0.065, 0.13, 0.12], "LeftSideLock");
  leftLock.rotation.z = -0.18;
  const rightLock = sphere(head, materials.hair, [0.19, 0.105, 0.045], [0.065, 0.13, 0.12], "RightSideLock");
  rightLock.rotation.z = 0.18;
  sphere(head, materials.hair, [0, -0.105, -0.07], [0.19, 0.10, 0.15], "BackHair");

  // Arms: sleeves, exposed upper arms, forearms and palms are attached to
  // shoulder/elbow/wrist bones respectively, so every segment follows joints.
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = joints[side + "Shoulder"];
    const elbow = joints[side + "Elbow"];
    const wrist = joints[side + "Wrist"];

    capsule(shoulder, materials.green, [0, 0, 0], [sign * 0.145, 0, 0], 0.095, side + "TShirtSleeve");
    capsule(shoulder, materials.skin, [sign * 0.13, 0, 0], [sign * 0.30, -0.015, 0], 0.061, side + "UpperArm");
    sphere(elbow, materials.skin, [0, 0, 0], [0.064, 0.064, 0.064], side + "ElbowJoint");
    capsule(elbow, materials.skin, [0, 0, 0], [sign * 0.27, -0.005, 0], 0.055, side + "Forearm");
    sphere(wrist, materials.skin, [0, 0, 0], [0.055, 0.06, 0.052], side + "Wrist");
    capsule(wrist, materials.skin, [0, 0, 0], [sign * 0.12, 0, 0], 0.065, side + "Hand");
    // Thumb nub gives the hand a readable silhouette.
    sphere(wrist, materials.skin, [sign * 0.055, -0.045, 0.045], [0.035, 0.065, 0.04], side + "Thumb");
  }

  // Waist and pants, with each leg's trousers following the thigh and knee.
  sphere(joints.hip, materials.pants, [0, -0.09, 0], [0.255, 0.22, 0.16], "BenWaist");
  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const thigh = joints[side + "Thigh"];
    const knee = joints[side + "Knee"];
    const ankle = joints[side + "Ankle"];
    capsule(thigh, materials.pants, [0, 0, 0], [0, -0.43, 0], 0.105, side + "TrouserUpper");
    capsule(knee, materials.pantsDark, [0, 0, 0], [0, -0.43, 0], 0.092, side + "TrouserLower");
    sphere(ankle, materials.pants, [0, 0, 0], [0.105, 0.11, 0.11], side + "AnkleCuff");

    // Shoes point forward (+Z); each shoe is parented to the ankle.
    sphere(ankle, materials.shoeWhite, [0, -0.075, 0.105], [0.135, 0.075, 0.22], side + "Sneaker");
    sphere(ankle, materials.sole, [0, -0.12, 0.11], [0.14, 0.035, 0.225], side + "Sole");
    sphere(ankle, materials.shoeGreen, [0, -0.025, 0.19], [0.105, 0.035, 0.105], side + "ToeGreen");
    sphere(ankle, materials.shoeWhite, [0, -0.005, 0.04], [0.11, 0.025, 0.09], side + "Tongue");
  }

  // Omnitrix on the outside of the left wrist, represented as a green/white
  // cuff and a dark central face.
  const omnitrix = new THREE.Group();
  omnitrix.name = "Omnitrix";
  omnitrix.position.set(-0.01, -0.005, 0.01);
  joints.leftWrist.add(omnitrix);
  add(omnitrix, new THREE.BoxGeometry(0.12, 0.13, 0.09), materials.shoeWhite, [0, 0, 0], null, "OmnitrixCuff");
  add(omnitrix, new THREE.BoxGeometry(0.075, 0.075, 0.018), materials.green, [0, 0, 0.052], null, "OmnitrixFace");
  add(omnitrix, new THREE.CircleGeometry(0.022, 16), materials.shoeWhite, [0, 0, 0.064], null, "OmnitrixEmblem");

  group.traverse(object => {
    if (object.isMesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return { group, rig, joints };
}
