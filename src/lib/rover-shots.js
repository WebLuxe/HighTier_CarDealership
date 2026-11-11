/**
 * The Range Rover's two resting states: plain numbers that the home page animates and src/lib/rover3d.js draws.
 * They live in their own file so the home page can use them without loading three.js.
 *
 * az, el    camera angle around the car (az 0 is dead ahead of the bonnet)
 * near      camera distance in metres while frame is 0
 * lens      field of view while frame is 0
 * frame     0: the close, hand-set shots. 1: the hero framing, worked out from the screen's shape
 * tx ty tz  what the camera looks at
 * env, key  reflections in the paint, the light on the bodywork
 * hall      the hall's lights, which come on in a wave from the far end towards you
 * drl, pod  the running-light blades, and the LED pods inside the headlamps
 * sweep, sweepR   how far the headlamps and tail lights have woken, from the middle of the car outwards (metres)
 * high      high beam
 * beam      the beams you can see in the air and on the floor
 * red       tail lights
 * carZ      how far along the hall the car is
 * road, roadGlow   distance driven while you scroll, and how bright the road markings are
 * rev, jolt, dive  the engine's loudness, the kick as it catches, and the nose dipping (+) or squatting (-)
 * dust, smoke      motes in the beams, and tyre smoke
 * spin, lock, burn, skid   a donut: the turn so far, the steering lock, the rear wheels spinning up, the rubber it leaves
 * nod, lean, hop, air      the body pitching, leaning and lifting on its springs, and the whole car off the ground
 * pull             the camera backing away to keep everything in shot
 */
export const DARK = {
  az: 0.55, el: 0.03, near: 1.3, lens: 28, tx: 0.7, ty: 1, tz: -3.84, roll: -0.04, frame: 0,
  bonnet: 0, bayGlow: 0, eRise: 0, eShake: 0, eBurst: 0, eForm: 0, sign: 0, signRed: 0, signWhite: 0, signFlash: 0, wave: -1, waveAmp: 0, env: 0, key: 0, hall: 0, drl: 0, pod: 0, sweep: 0.4, sweepR: 0.3, high: 0, beam: 0, red: 0, carZ: -6, road: 0, roadGlow: 0,
  rev: 0, jolt: 0, dive: 0, dust: 0, smoke: 0, spin: 0, lock: 0, burn: 0, skid: 0, nod: 0, lean: 0, hop: 0, air: 0, pull: 0,
};

export const HERO = {
  az: 0.66, el: 0.115, near: 3, lens: 28, tx: 0, ty: 0.78, tz: 0, roll: 0, frame: 1,
  bonnet: 0, bayGlow: 0, eRise: 0, eShake: 0, eBurst: 0, eForm: 0, sign: 0, signRed: 0, signWhite: 0, signFlash: 0, wave: -1, waveAmp: 0, env: 1, key: 1, hall: 1, drl: 1, pod: 0.3, sweep: 2, sweepR: 2, high: 0, beam: 0.3, red: 0.55, carZ: 0, road: 0, roadGlow: 0,
  rev: 0, jolt: 0, dive: 0, dust: 0.45, smoke: 0, spin: 0, lock: 0, burn: 0, skid: 0, nod: 0, lean: 0, hop: 0, air: 0, pull: 0,
};
