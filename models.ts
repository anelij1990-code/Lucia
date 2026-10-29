import * as T from 'three';
export const material = (color: number) => new T.MeshStandardMaterial({ color, roughness: .85 });
export const colors = { cream: material(0xf2dfb9), skin: material(0x918074), black: material(0x272d29), fur: material(0xb7652d), wood: material(0xa47b49), trunk: material(0x67503d), leaf: material(0x365c3e), lightLeaf: material(0x5f7c40), orange: material(0xed8b32), rock: material(0x8b9281) };
const sphere = new T.SphereGeometry(1, 10, 7);
const box = new T.BoxGeometry(1, 1, 1);
export function shape(parent: T.Object3D, m: T.Material, p: number[], scale: number[], square = false) {
  const mesh = new T.Mesh(square ? box : sphere, m);
  mesh.position.set(p[0], p[1], p[2]); mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function makeDog() {
  const root = new T.Group(), body = new T.Group(); root.add(body);
  shape(body, colors.skin, [0, .95, 0], [.3, .34, .62]);
  const neck = shape(body, colors.skin, [0, 1.25, .48], [.2, .37, .2]); neck.rotation.x = -.35;
  const head = new T.Group(); head.position.set(0, 1.6, .67); body.add(head);
  shape(head, colors.cream, [0, 0, 0], [.24, .25, .27]);
  shape(head, colors.cream, [0, -.08, .25], [.13, .12, .26]);
  shape(head, colors.black, [0, -.03, .48], [.075, .06, .05]);
  for (const x of [-1, 1]) {
    shape(head, colors.black, [x * .17, .045, .2], [.047, .052, .036]);
    shape(head, material(0xffffff), [x * .17 - .01, .065, .23], [.012, .014, .008]);
    for (let i = 0; i < 11; i++) {
      const strand = shape(head, colors.cream, [x * (.22 + Math.sin(i * 2.4) * .05), -.13, Math.cos(i * 2.4) * .09], [.05, .33 + i % 3 * .025, .045]);
      strand.rotation.z = x * (.15 + Math.sin(i) * .15);
    }
  }
  for (let i = 0; i < 12; i++) {
    const tuft = shape(head, colors.cream, [Math.sin(i * 2.4) * .15, .19, Math.cos(i * 2.4) * .12], [.05, .17, .05]);
    tuft.rotation.z = Math.sin(i) * .4;
  }
  shape(head, material(0xe1a1a1), [.035, -.2, .33], [.04, .07, .025]);
  const legs: T.Group[] = [];
  for (const z of [-.43, .43]) for (const x of [-.22, .22]) {
    const leg = new T.Group(); leg.position.set(x, .86, z); body.add(leg);
    shape(leg, colors.skin, [0, -.25, 0], [.065, .3, .065]);
    shape(leg, colors.cream, [0, -.58, .02], [.12, .18, .12]);
    for (let i = 0; i < 5; i++) shape(leg, colors.cream, [Math.sin(i * 2.4) * .08, -.58, Math.cos(i * 2.4) * .08], [.035, .2, .035]);
    shape(leg, colors.cream, [0, -.73, .1], [.12, .08, .18]); legs.push(leg);
  }
  shape(body, colors.black, [0, 1.01, .28], [.61, .12, .13], true);
  shape(body, colors.black, [0, 1.26, .1], [.1, .08, .53], true);
  const tail = new T.Group(); tail.position.set(0, 1.07, -.56); body.add(tail); tail.rotation.x = -.45;
  shape(tail, colors.skin, [0, .22, -.1], [.05, .28, .05]);
  for (let i = 0; i < 12; i++) shape(tail, colors.cream, [Math.sin(i * 2.4) * .075, .5, -.14 + Math.cos(i * 2.4) * .075], [.045, .27, .045]);
  return { root, body, legs, tail };
}
export function makeSquirrel() {
  const g = new T.Group();
  shape(g, colors.fur, [0, .3, 0], [.18, .24, .28]);
  shape(g, colors.cream, [0, .33, .17], [.1, .16, .07]);
  shape(g, colors.fur, [0, .55, .23], [.16, .16, .18]);
  shape(g, colors.black, [0, .52, .4], [.04, .03, .03]);
  for (const x of [-.11, .11]) {
    shape(g, colors.fur, [x, .73, .22], [.05, .13, .05]);
    shape(g, colors.black, [x, .58, .35], [.03, .035, .02]);
    shape(g, colors.fur, [x, .1, .12], [.07, .07, .13]);
  }
  const tail = shape(g, colors.fur, [0, .57, -.35], [.2, .4, .18]); tail.rotation.x = -.5;
  shape(g, colors.fur, [0, .88, -.46], [.18, .19, .18]); return g;
}
export function makeTruck() {
  const g = new T.Group();
  shape(g, colors.black, [0, .45, 0], [1.5, .25, 2.4], true);
  shape(g, colors.orange, [0, .95, -.6], [1.5, .95, 1.1], true);
  shape(g, material(0x91bcb5), [0, 1.23, .48], [1.3, 1.05, 1], true);
  shape(g, colors.orange, [0, 1.82, .48], [1.5, .15, 1.2], true);
  shape(g, colors.orange, [0, .7, 1.04], [1.5, .3, .15], true);
  for (const x of [-.76, .76]) for (const z of [-.76, .76]) shape(g, colors.black, [x, .35, z], [.22, .34, .34]);
  const brushes: T.Group[] = [];
  for (const x of [-.6, .6]) {
    const b = new T.Group(); b.position.set(x, .18, 1.35); g.add(b); brushes.push(b);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      shape(b, colors.orange, [Math.sin(a) * .28, 0, Math.cos(a) * .28], [.12, .2, .12], true);
    }
  }
  const lampMat = new T.MeshStandardMaterial({ color: 0xffba35, emissive: 0xffa000, emissiveIntensity: 2 });
  shape(g, lampMat, [0, 2, .45], [.13, .16, .13]);
  return { root: g, brushes, lampMat };
}
export function makeBone(boost: boolean) {
  const g = new T.Group(), m = boost ? material(0xfac659) : colors.cream;
  shape(g, m, [0, 0, 0], [.4, .1, .1], true);
  for (const x of [-.22, .22]) for (const z of [-.06, .06]) shape(g, m, [x, 0, z], [.09, .08, .09]);
  return g;
}

