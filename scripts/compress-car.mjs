// Offline geometry compression using the installed official Draco encoder.
// Keep the authored topology, materials, UVs, images and copyright metadata.
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const input = process.argv[2], output = process.argv[3]
if (!input || !output) throw new Error('Usage: node compress-car.mjs INPUT OUTPUT')
const source = fs.readFileSync(input)
const jsonLength = source.readUInt32LE(12)
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength).toString())
const binary = source.subarray(28 + jsonLength)
const encoderPath = fs.realpathSync('node_modules/three/examples/jsm/libs/draco/draco_encoder.js')
const context = { module: { exports: {} }, exports: {}, require: createRequire(import.meta.url), console, process, Buffer, __filename: encoderPath, __dirname: encoderPath.slice(0, encoderPath.lastIndexOf('/')), setTimeout, clearTimeout }
vm.runInNewContext(fs.readFileSync(encoderPath, 'utf8'), context)
const draco = context.module.exports()
const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }
const types = { 5120: ['readInt8', 1, 127], 5121: ['readUInt8', 1, 255], 5122: ['readInt16LE', 2, 32767], 5123: ['readUInt16LE', 2, 65535], 5125: ['readUInt32LE', 4, 4294967295], 5126: ['readFloatLE', 4, 1] }
function readAccessor(index, integer = false) {
  const a = gltf.accessors[index], v = gltf.bufferViews[a.bufferView]
  if (a.sparse) throw new Error('Sparse accessors require explicit handling')
  const [reader, bytes, divisor] = types[a.componentType], components = sizes[a.type]
  const result = integer ? new Int32Array(a.count * components) : new Float32Array(a.count * components)
  const start = (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || components * bytes
  for (let i = 0; i < a.count; i++) for (let j = 0; j < components; j++) {
    let value = binary[reader](start + i * stride + j * bytes)
    if (a.normalized) value = Math.max(-1, value / divisor)
    result[i * components + j] = value
  }
  return result
}
const compressedAccessors = new Set(), compressedViews = new Map()
for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
  if ((primitive.mode ?? 4) !== 4 || primitive.targets) throw new Error('Only static triangles supported')
  const dm = new draco.Mesh(), builder = new draco.MeshBuilder(), encoder = new draco.Encoder(), encoded = new draco.DracoInt8Array()
  const indices = readAccessor(primitive.indices, true)
  builder.AddFacesToMesh(dm, indices.length / 3, indices)
  const attributes = {}
  for (const [semantic, index] of Object.entries(primitive.attributes)) {
    const type = semantic === 'POSITION' ? draco.POSITION : semantic === 'NORMAL' ? draco.NORMAL : semantic.startsWith('TEXCOORD') ? draco.TEX_COORD : draco.GENERIC
    const accessor = gltf.accessors[index]
    attributes[semantic] = builder.AddFloatAttributeToMesh(dm, type, accessor.count, sizes[accessor.type], readAccessor(index))
    compressedAccessors.add(index)
  }
  compressedAccessors.add(primitive.indices)
  encoder.SetSpeedOptions(4, 4)
  encoder.SetAttributeQuantization(draco.POSITION, 14)
  encoder.SetAttributeQuantization(draco.NORMAL, 12)
  encoder.SetAttributeQuantization(draco.TEX_COORD, 16)
  encoder.SetAttributeQuantization(draco.GENERIC, 16)
  encoder.SetEncodingMethod(draco.MESH_EDGEBREAKER_ENCODING)
  const length = encoder.EncodeMeshToDracoBuffer(dm, encoded)
  if (length <= 0) throw new Error('Draco encode failed')
  const bytes = Buffer.alloc(length)
  for (let i = 0; i < length; i++) bytes[i] = encoded.GetValue(i) & 255
  const view = gltf.bufferViews.length
  gltf.bufferViews.push({ buffer: 0, byteLength: length })
  compressedViews.set(view, bytes)
  primitive.extensions = { ...primitive.extensions, KHR_draco_mesh_compression: { bufferView: view, attributes } }
  for (const item of [dm, builder, encoder, encoded]) draco.destroy(item)
}
for (const index of compressedAccessors) { delete gltf.accessors[index].bufferView; delete gltf.accessors[index].byteOffset }
const used = new Set([...compressedViews.keys()])
for (const a of gltf.accessors) if (a.bufferView !== undefined) used.add(a.bufferView)
for (const image of gltf.images) if (image.bufferView !== undefined) used.add(image.bufferView)
const views = [], parts = [], remap = new Map(); let offset = 0
for (const oldIndex of used) {
  const old = gltf.bufferViews[oldIndex]
  const bytes = compressedViews.get(oldIndex) || binary.subarray(old.byteOffset || 0, (old.byteOffset || 0) + old.byteLength)
  const padding = (4 - offset % 4) % 4
  if (padding) { parts.push(Buffer.alloc(padding)); offset += padding }
  remap.set(oldIndex, views.length)
  views.push({ ...old, byteOffset: offset, byteLength: bytes.length })
  parts.push(bytes); offset += bytes.length
}
for (const a of gltf.accessors) if (a.bufferView !== undefined) a.bufferView = remap.get(a.bufferView)
for (const image of gltf.images) if (image.bufferView !== undefined) image.bufferView = remap.get(image.bufferView)
for (const mesh of gltf.meshes) for (const p of mesh.primitives) p.extensions.KHR_draco_mesh_compression.bufferView = remap.get(p.extensions.KHR_draco_mesh_compression.bufferView)
gltf.bufferViews = views; gltf.buffers = [{ byteLength: offset }]
gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed || []), 'KHR_draco_mesh_compression'])]
gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired || []), 'KHR_draco_mesh_compression'])]
let json = Buffer.from(JSON.stringify(gltf)), bin = Buffer.concat(parts)
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)])
bin = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)])
const header = Buffer.alloc(12), jh = Buffer.alloc(8), bh = Buffer.alloc(8)
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + bin.length, 8)
jh.writeUInt32LE(json.length, 0); jh.writeUInt32LE(0x4e4f534a, 4)
bh.writeUInt32LE(bin.length, 0); bh.writeUInt32LE(0x004e4942, 4)
fs.writeFileSync(output, Buffer.concat([header, jh, json, bh, bin]))
console.log(JSON.stringify({ inputBytes: source.length, outputBytes: fs.statSync(output).size, primitives: compressedViews.size, positionBits: 14, normalBits: 12, uvBits: 16, copyright: gltf.asset.copyright }))
