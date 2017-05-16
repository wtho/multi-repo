const watch = require('node-watch')
const path = require('path')
const fs = require('fs-extra')
const process = require('child-process-promise').exec

const repos = {
  basePath: '/home/tho/workspace/node-git',
  names: [
    '1-testrepo',
    '2-testrepo'
  ]
}

const options = {
  recursive: true,
  filter: function(name) {
    // everything outside .git and .git/HEAD
    // to track .git/HEAD the .git folder must be included
    return !/\.git.+/.test(name) || /\.git\/HEAD$/.test(name)
  }
}

const branches = { }
const status = { }

for (const repo of repos.names) {
  const repoPath = path.join(repos.basePath, repo);
  watch(repoPath, options, function (evt, name) {
    if (/\.git\/HEAD$/.test(name)) {
      // branch changed
      branchChanged(repo).then((branch) => {
        branches[repo] = branch
        console.log(branches)
      })
    } else {
      // some file changed
      gitStatus(repo).then((repoStatus) => {
        status[repo] = repoStatus
        console.log(status);
      })
    }
  })
}


function branchChanged(repo) {
  // read repo/.git/HEAD
  return fs.readFile(path.join(repos.basePath, repo, '.git', 'HEAD'), {encoding: 'utf8'})
    .then((headFile) => {
      return headFile.substr(16, headFile.length-17)
    })
}

function gitStatus(repo) {
  //console.log(`cd ${path.join(repos.basePath, repo)} && git status`);
  return process(`cd ${path.join(repos.basePath, repo)} && git status --porcelain`)
    .then((result) => {
    if (result.stderr) {
      throw new Error(`git status error in repo ${repo}: ${result.stderr}`)
    }
    let output = result.stdout.split(/[\r\n]+/)
    output.splice(output.length -1, 1)
    return output
  })
}




// init branches
Promise.all(repos.names.map((repo) => {
  return branchChanged(repo).then((branch) => {
    return { name: repo,  branch }
  })
})).then((repoBranches) => {
  repoBranches.forEach((repoBranch) =>{
    branches[repoBranch.name] = repoBranch.branch
  })
  console.log(branches)
}).catch(console.error)

// init status
Promise.all(repos.names.map((repo) => {
  return gitStatus(repo).then((status) => {
    return { name: repo,  status }
  })
})).then((repoStatus) => {
  repoStatus.forEach((repoState) =>{
    status[repoState.name] = repoState.status
  })
  console.log(status)
}).catch(console.error)
