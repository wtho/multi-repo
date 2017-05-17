const col = require('cli-color')
const Watcher = require('./repoWatcher')


const options = {
  basePath: '/home/tho/workspace/node-git',
  names: [
    '1-testrepo',
    '2-testrepo'
  ],
  // always print branches and status
  hooks: {
    init: print,
    branch: function(b,s) {
      console.log('update branch')
      print(b,s)
    },
    status: function(b,s) {
      console.log('update file')
      print(b,s)
    },
  }
}

function print(branches, status) {
  options.names.map((repo) => {
    console.log(` ${repo} on branch ${branches[repo]} `)
    status[repo].map((fileStatus) => {
      console.log(`${fileStatus}`);
    })
  })
}

new Watcher(options)
