#!/usr/bin/env bash

git clone https://github.com/creationix/nvm.git /tmp/.nvm
source /tmp/.nvm/nvm.sh
nvm install "$NODE_VERSION"
nvm use --delete-prefix "$NODE_VERSION"

if [[ "$TRAVIS_OS_NAME" == "linux" ]]; then
  sudo add-apt-repository ppa:ubuntu-toolchain-r/test -y;
  sudo apt-get update -qq
  sudo apt-get install g++-4.9
  sudo apt-get install libasound2-dev
  sudo update-alternatives --install /usr/bin/gcc gcc /usr/bin/gcc-4.9 60 --slave /usr/bin/g++ g++ /usr/bin/g++-4.9
  export DISPLAY=:99.0
  sh -e /etc/init.d/xvfb start
  sleep 3
fi

#node --version
#npm --version

npm install
npm run release
#npm test & npm run e2e
