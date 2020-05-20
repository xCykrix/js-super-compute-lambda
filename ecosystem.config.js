const apps = []

const lowerBound = 8000

const bindings = 4
const servers = 1

function range (size, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt)
}
const ranges = range(bindings, lowerBound)

for (const range of ranges) {
  apps.push({
    name: `super-computer-${range}`,
    script: 'server.js',
    args: [`${range}`],
    instances: servers,
    exec_mode: (servers === 1 ? 'fork' : 'cluster')
  })
}

module.exports = {
  lowerBound,
  bindings,
  servers,
  ranges,
  apps
}
