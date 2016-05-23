cmd=`which pm2`
action=$1
app=$2
id=$3
mongodb_url=$4

function run(){
  port=$(./tools/freeport.sh 8080 1)

  if [ ! -e $app ]; then
    echo -e "ERR_FILE_404_$app"
    exit 1
  fi

  $cmd start $app \
    --name $id -x -- \
    --prod \
    --port $port \
    --MONGODB_URL=$mongodb_url > /dev/null

  echo $port
  exit $?
}

function pm2call(){
  pm2 $1 $app > /dev/null
  exit $?
}

function usage(){
  echo -e "\n ${0} options args"
  echo -e "\n\t Options:"
  echo -e "\n\t -run server.js app_id - start the app with random port"
  echo -e "\t -stop app_id - stop app"
  echo -e "\t -start app_id - start app"
  echo -e "\t -remove app_id - remove app from pm2 config"
  echo -e "\t -stats app_id - show info "
  echo -e "\t -help show usage info "

  echo -e "\n\n\t Examples:"
  echo -e "\n\t ${0} -run /server/miapp/app.js miapp:1"
  echo -e "\t ${0} -stop miapp:1"
  echo -e "\t ${0} -start miapp:1"
  echo -e "\t ${0} -remove miapp:1"
  echo -e "\t ${0} -stats miapp:1\n\n"

  exit 0
}

if [[ $# -lt 2 ]]; then
  usage
fi

case $action in
  -stop) pm2call "stop";;
  -start) pm2call "start";;
  -restart) pm2call "restart";;
  -remove) pm2call "delete";;
  -h|--help) usage;;
  -r|-run) run;;
esac
