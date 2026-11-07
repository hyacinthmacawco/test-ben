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

  // Rounded lofts create tapered, continuous-looking forms instead of
  // straight capsules with abrupt intersections at the joints.
  const loftAlongX = (parent, material, length, startRadius, endRadius, sign, name) => {
    const half = length * 0.5;
    const r0 = startRadius;
    const r1 = endRadius;
    const profile = [
      new THREE.Vector2(r0 * 0.68, -half),
      new THREE.Vector2(r0 * 0.92, -half + 0.018),
      new THREE.Vector2(r0, -half + 0.055),
      new THREE.Vector2(r0 * 0.98 + r1 * 0.02, -half * 0.18),
      new THREE.Vector2(r0 * 0.25 + r1 * 0.75, half * 0.18),
      new THREE.Vector2(r1, half - 0.055),
      new THREE.Vector2(r1 * 0.92, half - 0.018),
      new THREE.Vector2(r1 * 0.68, half)
    ];
    const geometry = new THREE.LatheGeometry(profile, 40);
    geometry.computeVertexNormals();
    const mesh = add(parent, geometry, material,
      [sign * half, 0, 0], null, name);
    mesh.rotation.z = -sign * Math.PI / 2;
    return mesh;
  };

  // Torso: use a shaped, tapered shirt volume instead of a round sphere.
  // The shoulder line is broad, the waist is narrower, and the hem stays
  // fairly straight like Ben's fitted Omniverse shirt.
  const spine = joints.spine;
  const shirtProfile = [
    new THREE.Vector2(0.205, -0.32),
    new THREE.Vector2(0.235, -0.305),
    new THREE.Vector2(0.252, -0.265),
    new THREE.Vector2(0.260, -0.12),
    new THREE.Vector2(0.275, 0.08),
    new THREE.Vector2(0.285, 0.245),
    new THREE.Vector2(0.265, 0.335),
    new THREE.Vector2(0.215, 0.415),
    new THREE.Vector2(0.145, 0.455)
  ];
  const shirtBody = add(spine, new THREE.LatheGeometry(shirtProfile, 96),
    materials.shirtBlack, [0, 0.08, 0], [1, 1, 0.76], "BenShirtTorso");
  shirtBody.geometry.computeVertexNormals();
  // Shirt graphics are painted into the torso's UV texture, not separate meshes.
  const shirtCanvas = document.createElement("canvas");
  shirtCanvas.width = 512;
  shirtCanvas.height = 512;
  const shirtCtx = shirtCanvas.getContext("2d");
  shirtCtx.fillStyle = "#111714";
  shirtCtx.fillRect(0, 0, 512, 512);
  // LatheGeometry's front-facing seam is at both U edges (0 and 1).
  shirtCtx.fillStyle = "#079b4c";
  shirtCtx.fillRect(0, 0, 22, 512);
  shirtCtx.fillRect(490, 0, 22, 512);
  // Small green collar area near the top of the torso UV.
  shirtCtx.fillRect(0, 0, 512, 48);
  shirtCtx.fillStyle = "#168b4c";
  shirtCtx.font = "900 112px Arial";
  shirtCtx.textAlign = "center";
  shirtCtx.textBaseline = "middle";
  shirtCtx.lineJoin = "round";
  shirtCtx.strokeStyle = "#f1f0e7";
  shirtCtx.lineWidth = 13;
  // Front-facing UV seam is split between the left and right canvas edges.
  // Drawing at both edges joins the two halves into one front-facing "10".
  for (const seamX of [0, 512]) {
    shirtCtx.strokeText("10", seamX, 245);
    shirtCtx.fillText("10", seamX, 245);
  }
  const shirtTexture = new THREE.CanvasTexture(shirtCanvas);
  shirtTexture.colorSpace = THREE.SRGBColorSpace;
  shirtTexture.flipY = true;
  materials.shirtBlack.map = shirtTexture;
  materials.shirtBlack.color.set(0xffffff);
  materials.shirtBlack.needsUpdate = true;
  // Green sleeve seams follow the shoulder slope.
  for (const side of ["left", "right"]) {
    const s = side === "left" ? -1 : 1;
    capsule(spine, materials.greenDark, [s * 0.18, 0.39, 0.005], [s * 0.285, 0.27, 0.008], 0.038, side + "ShoulderAccent");
  }

  // Neck and head.
  sphere(joints.neck, materials.skin, [0, 0.075, 0], [0.112, 0.235, 0.11], "BenNeck");
  const head = joints.head;
  sphere(head, materials.skin, [0, 0.075, 0.015], [0.225, 0.285, 0.19], "BenHead");
  // A single curved face decal carries the eyes, brows and mouth as pixels.
  // Its vertices follow the ellipsoid head surface, avoiding floating feature meshes.
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 512;
  faceCanvas.height = 512;
  const faceCtx = faceCanvas.getContext("2d");
  faceCtx.clearRect(0, 0, 512, 512);

  // Larger almond-shaped eyes with white sclera and green irises only.
  // Ben's design has no black pupils; the green iris remains the focal point.
  for (const x of [174, 338]) {
    faceCtx.fillStyle = "#f4eee3";
    faceCtx.beginPath();
    faceCtx.moveTo(x - 57, 226);
    faceCtx.quadraticCurveTo(x - 43, 184, x, 190);
    faceCtx.quadraticCurveTo(x + 43, 184, x + 57, 226);
    faceCtx.quadraticCurveTo(x + 34, 260, x, 258);
    faceCtx.quadraticCurveTo(x - 34, 260, x - 57, 226);
    faceCtx.closePath();
    faceCtx.fill();

    faceCtx.fillStyle = "#159b50";
    faceCtx.beginPath();
    faceCtx.ellipse(x + 2, 225, 25, 31, 0, 0, Math.PI * 2);
    faceCtx.fill();
    // A restrained darker green rim gives the iris definition without a pupil.
    faceCtx.strokeStyle = "#08763b";
    faceCtx.lineWidth = 4;
    faceCtx.stroke();
  }

  // Broader, gently angled brows with proportions closer to the reference.
  faceCtx.strokeStyle = "#38231d";
  faceCtx.lineWidth = 20;
  faceCtx.lineCap = "round";
  faceCtx.beginPath();
  faceCtx.moveTo(111, 164);
  faceCtx.quadraticCurveTo(164, 140, 218, 160);
  faceCtx.moveTo(294, 160);
  faceCtx.quadraticCurveTo(348, 140, 401, 164);
  faceCtx.stroke();

  // Wider, shallow smile; keep the line subtle rather than cartoonishly thick.
  faceCtx.strokeStyle = "#241914";
  faceCtx.lineWidth = 7;
  faceCtx.lineCap = "round";
  faceCtx.beginPath();
  faceCtx.moveTo(151, 350);
  faceCtx.quadraticCurveTo(256, 392, 361, 350);
  faceCtx.stroke();

  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.needsUpdate = true;

  const facePositions = [];
  const faceUvs = [];
  const faceIndices = [];
  const cols = 32;
  const rows = 32;
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    const y = 0.235 - v * 0.34;
    for (let col = 0; col <= cols; col++) {
      const u = col / cols;
      const x = (u - 0.5) * 0.39;
      const nx = x / 0.225;
      const ny = (y - 0.075) / 0.285;
      const depth = Math.sqrt(Math.max(0.02, 1 - nx * nx - ny * ny));
      const z = 0.015 + 0.19 * depth + 0.002;
      facePositions.push(x, y, z);
      faceUvs.push(u, 1 - v);
      if (row < rows && col < cols) {
        const a = row * (cols + 1) + col;
        const b = a + cols + 1;
        faceIndices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const faceGeometry = new THREE.BufferGeometry();
  faceGeometry.setAttribute("position", new THREE.Float32BufferAttribute(facePositions, 3));
  faceGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(faceUvs, 2));
  faceGeometry.setIndex(faceIndices);
  faceGeometry.computeVertexNormals();
  const face = new THREE.Mesh(faceGeometry, new THREE.MeshBasicMaterial({
    map: faceTexture, transparent: true, depthWrite: false, side: THREE.DoubleSide
  }));
  face.name = "BenFaceTexture";
  head.add(face);

  // The nose remains a small sculpted form; eyes, brows and mouth are texture artwork.
  sphere(head, materials.skinLight, [0, 0.025, 0.218], [0.022, 0.038, 0.027], "Nose");

  // Ears remain modeled as part of the head silhouette.
  for (const side of ["left", "right"]) {
    const s = side === "left" ? -1 : 1;
    sphere(head, materials.skin, [s * 0.218, 0.055, 0.005], [0.052, 0.085, 0.045], side + "Ear");
  }

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

    // The sleeve, upper arm and forearm are softly tapered lofts. Their
    // rounded ends deliberately overlap the hidden joint volumes to avoid
    // the segmented toy-arm appearance while retaining elbow articulation.
    loftAlongX(shoulder, materials.green, 0.235, 0.112, 0.096, sign, side + "TShirtSleeve");
    loftAlongX(shoulder, materials.skin, 0.355, 0.074, 0.066, sign, side + "UpperArm");
    sphere(elbow, materials.skin, [0, 0, 0], [0.073, 0.073, 0.073], side + "ElbowJoint");
    loftAlongX(elbow, materials.skin, 0.325, 0.066, 0.059, sign, side + "Forearm");
    sphere(wrist, materials.skin, [0, 0, 0], [0.055, 0.06, 0.052], side + "Wrist");
    capsule(wrist, materials.skin, [0, 0, 0], [sign * 0.12, 0, 0], 0.065, side + "Hand");
    // Thumb nub gives the hand a readable silhouette.
    sphere(wrist, materials.skin, [sign * 0.055, -0.045, 0.045], [0.035, 0.065, 0.04], side + "Thumb");
  }

  // Waist and trousers: a tapered pelvis avoids the spherical diaper-like
  // silhouette. The lower legs widen toward the hems to match Ben's flared jeans.
  const hip = joints.hip;
  const pelvisProfile = [
    new THREE.Vector2(0.145, -0.255),
    new THREE.Vector2(0.165, -0.225),
    new THREE.Vector2(0.185, -0.145),
    new THREE.Vector2(0.195, -0.045),
    new THREE.Vector2(0.175, 0.025),
    new THREE.Vector2(0.145, 0.145)
  ];
  add(hip, new THREE.LatheGeometry(pelvisProfile, 96), materials.pants,
    [0, -0.005, 0], [1, 1, 0.82], "BenWaist");

  const trouserSegment = (parent, topRadius, hemRadius, name) => {
    // A softly rounded loft replaces the flat-ended cylinder and separate
    // seam spheres. It extends slightly through each joint so the upper and
    // lower trouser sections overlap instead of exposing a dark gap.
    const halfLength = 0.255;
    const profile = [
      new THREE.Vector2(hemRadius * 0.88, -halfLength),
      new THREE.Vector2(hemRadius * 0.97, -halfLength + 0.018),
      new THREE.Vector2(hemRadius, -halfLength + 0.060),
      new THREE.Vector2(hemRadius * 0.98, -halfLength * 0.35),
      new THREE.Vector2(topRadius * 1.02, halfLength * 0.28),
      new THREE.Vector2(topRadius, halfLength - 0.060),
      new THREE.Vector2(topRadius * 0.97, halfLength - 0.018),
      new THREE.Vector2(topRadius * 0.88, halfLength)
    ];
    const geometry = new THREE.LatheGeometry(profile, 48);
    geometry.computeVertexNormals();
    const leg = add(parent, geometry, materials.pants, [0, -0.215, 0],
      [1, 1, 0.90], name);
    return leg;
  };

  for (const side of ["left", "right"]) {
    const sign = side === "left" ? -1 : 1;
    const thigh = joints[side + "Thigh"];
    const knee = joints[side + "Knee"];
    const ankle = joints[side + "Ankle"];
    trouserSegment(thigh, 0.105, 0.115, side + "TrouserUpper");
    trouserSegment(knee, 0.092, 0.145, side + "TrouserLower");
    sphere(ankle, materials.pants, [0, 0, 0], [0.108, 0.12, 0.108], side + "AnkleCuff");

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
