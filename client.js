const WebSocket = require('ws')
const JSFunction = require('./lambda')

const step = 1000000
const primeLowerBound = 1
const primeUpperBound = 100000000
const condition = '$INPUT MUST BE A PRIME NUMBER'

function range (size, startAt = 0) {
  return [...Array(size).keys()].map(i => i + startAt)
}

console.time('calculationPeriod')

const origins = ['95.216.170.62', '95.216.163.182', '95.216.172.37']
const ports = require('./ecosystem.config.js').ranges

let dispatched = false
let streamed = 0
let finished = 0

const pending = {}
let primes = []

async function dispatch () {
  for (let i = primeUpperBound; i >= primeLowerBound - 1; i--) {
    if (((i / step) % 1 === 0 && i !== primeUpperBound) || i === 0) {
      const rangeList = range(step, i + 1)
      streamed++

      new Promise((resolve, reject) => {
        const WSS = new WebSocket(`ws://${origins[Math.floor(Math.random() * origins.length)]}:${ports[Math.floor(Math.random() * ports.length)]}/`)

        WSS.on('open', () => {
          const stack = {
            referenceId: require('crypto').randomBytes(8).toString('hex'),
            evalPayload: (numbers) => {
              function isPrime (refNum) {
                var sqrtnum = Math.floor(Math.sqrt(refNum))
                var prime = refNum !== 1
                for (var i = 2; i < sqrtnum + 1; i++) {
                  if (refNum % i === 0) {
                    prime = false
                    break
                  }
                }
                return prime
              }

              const responses = []

              for (const number of numbers) {
                responses.push({ input: number, output: isPrime(number) })
              }

              return responses
            },
            evalParams: [rangeList]
          }
          WSS.send(JSFunction.stringify(stack))

          pending[stack.referenceId] = {
            referenceId: stack.referenceId,
            callback: (fullResponse) => {
              fullResponse.answers = fullResponse.answers.filter((check) => { return check.output === true })
              primes = primes.concat(fullResponse.answers)
            },
            resolve
          }
        })

        WSS.on('message', (content) => {
          const stack = JSFunction.parse(content)
          if (pending[stack.referenceId]) {
            pending[stack.referenceId].callback(stack)
            finished++
            pending[stack.referenceId].resolve()
          }
          delete pending[stack.referenceId]
          WSS.close()
        })

        WSS.on('error', (err) => {
          return reject(err)
        })
      }).catch((err) => {
        console.error('[Socket] Something went wrong during dispatch. Pleas try again!\n', err)
      })
      await new Promise((resolve) => {
        setTimeout(resolve, 500)
      })
    }
  }
  dispatched = true
}
dispatch()

setInterval(() => {
  if (Object.keys(pending).length === 0 && dispatched) {
    console.info('Finished executions for session.')

    // post process results
    primes.sort((a, b) => {
      return a.input < b.input
    })

    console.info(`[Finished] ${results.length} out of ${primeUpperBound} matched the expected condition. [${condition}]`)
    console.timeEnd('calculationPeriod')
    // eslint-disable-next-line no-process-exit
    process.exit(0)
  }
  console.info(`[%] ${finished}/${streamed} of calculations complete. [${condition}]`)
}, 100)
