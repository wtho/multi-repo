const watch = require('node-watch')
const path = require('path')
const fs = require('fs-extra')
const process = require('child-process-promise').exec


const fileWatchOptions = {
  recursive: true,
  filter: function(name) {
    // everything outside .git and .git/HEAD
    // to track .git/HEAD the .git folder must be included
    return !/\.git.+/.test(name) || /\.git\/HEAD$/.test(name)
  }
}

class RepoWatcher {

  constructor(options) {
    this.options = options
    this.branches = {}
    this.status = {}
    this.repos = options.names
    this.basePath = options.basePath

    const initBranches = Promise.all(this.repos.map((repo) => {
      return this.branchChanged(repo).then((branch) => {
        return { name: repo,  branch }
      })
    })).then((repoBranches) => {
      repoBranches.forEach((repoBranch) =>{
        this.branches[repoBranch.name] = repoBranch.branch
      })
    })

    const initStatus = Promise.all(this.repos.map((repo) => {
      return this.gitStatus(repo).then((status) => {
        return { name: repo,  status }
      })
    })).then((repoStatus) => {
      repoStatus.forEach((repoState) =>{
        this.status[repoState.name] = repoState.status
      })
    })

    Promise.all([initBranches, initStatus])
      .then(() => {
        this.print()
      }).catch(console.error)
    this.init()
  }

  init() {
    // install filewatchers for each repo
    const parent = this
    for (var repo of this.repos) {
      const repoPath = path.join(this.basePath, repo);
      watch(repoPath, fileWatchOptions, function (evt, name) {
        if (/\.git\/HEAD$/.test(name)) {
          // branch changed
          parent.branchChanged(repo).then((branch) => {
            parent.branches[repo] = branch
            parent.print()
          })
        } else {
          // some file changed
          gitStatus(repo).then((repoStatus) => {
            parent.status[repo] = repoStatus
            parent.print()
          })
        }
      })
    }
  }


  branchChanged(repo) {
    // read repo/.git/HEAD
    return fs.readFile(path.join(this.basePath, repo, '.git', 'HEAD'), {encoding: 'utf8'})
      .then((headFile) => {
        return headFile.substr(16, headFile.length-17)
      })
  }

  gitStatus(repo) {
    return process(`cd ${path.join(this.basePath, repo)} && git status --porcelain`)
      .then((result) => {
      if (result.stderr) {
        throw new Error(`git status error in repo ${repo}: ${result.stderr}`)
      }
      let output = result.stdout.split(/[\r\n]+/)
      output.splice(output.length -1, 1)
      return output
    })
  }

  print() {
    console.log('\n\n')
    this.repos.map((repo) => {
      console.log(`${repo} on branch ${this.branches[repo]}`);
      this.status[repo].map((fileStatus) => {
        console.log(`${fileStatus}`);
      })
    })
  }

}

module.exports = RepoWatcher
