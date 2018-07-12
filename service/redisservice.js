const redis = require('redis');

const redisClient = redis.createClient(process.env.REDIS_URL);

module.exports = {
  getObject: key => new Promise((resolve, reject) => {
    redisClient.hgetall(key, (err, auth) => {
      if (err) {
        return reject(err);
      }
      resolve(auth);
    });
  }),

  setObject: (key, object) => new Promise((resolve, reject) => {
    redisClient.hmset(key, object, (err, reply) => {
      if (err || reply !== 'OK') {
        return reject(err);
      }
      resolve(reply);
    });
  }),

  keyExists: key => new Promise((resolve, reject) => {
    redisClient.exists(key, (err, reply) => {
      if (err || reply === 1) {
        return reject(err);
      }
      resolve();
    });
  }),

  keysMatching: pattern => new Promise((resolve, reject) => {
    const scan = (cursor = '0', priorKeys = []) => {
      redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', '10', (err, res) => {
        if (err) {
          return reject(err);
        }

        const [nextCursor, keys] = res;

        if (nextCursor === '0') {
          return resolve(priorKeys.concat(keys));
        }

        return scan(nextCursor, priorKeys.concat(keys));
      });
    };
    scan();
  }),
};
