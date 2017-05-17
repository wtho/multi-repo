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
    this.hooks = options.hooks

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
        this.invokeHook('init')
      }).catch(console.error)
    this.init()
  }

  init() {
    // install filewatchers for each repo
    const parent = this
    for (const repo of this.repos) {
      const repoPath = path.join(this.basePath, repo);
      watch(repoPath, fileWatchOptions, function (evt, name) {
        if (/\.git\/HEAD$/.test(name)) {
          // branch changed
          parent.branchChanged(repo).then((branch) => {
            parent.branches[repo] = branch
            parent.invokeHook('branch')
          })
        } else {
          // some file changed
          if (parent.status[repo] === 'pending') return;
          parent.status[repo] = 'pending'
          parent.gitStatus(repo).then((repoStatus) => {
            parent.status[repo] = repoStatus
            parent.invokeHook('status')
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
    return process(`cd ${path.join(this.basePath, repo)} && git status --porcelain=1`)
      .then((result) => {
      if (result.stderr) {
        throw new Error(`git status error in repo ${repo}: ${result.stderr}`)
      }
      let output = result.stdout.split(/[\r\n]+/)
      output.splice(output.length -1, 1)
      return output
    })
  }

  invokeHook(key) {
    if (this.hooks && this.hooks[key]) {
      // only hook status if no git status is pending
      if (key === 'status') {
        const pending = this.repos.some((el, i, arr) => {
          return this.status[el] === 'pending'
        })
        if (pending) return
      }
      this.hooks[key](this.branches, this.status)
    }
  }
}

module.exports = RepoWatcher
