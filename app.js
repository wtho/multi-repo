const Watcher = require('./repoWatcher')

const repos = {
  basePath: '/home/tho/workspace/node-git',
  names: [
    '1-testrepo',
    '2-testrepo'
  ]
}

new Watcher(repos)
