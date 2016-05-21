#!/bin/bash
#
# Please run as root.
# Usage: bash findport.sh 3000 100
#


if [[ -z "$1" || -z "$2" ]]; then
  echo "Usage: $0 <base_port> <increment>"
  exit 1
fi


BASE=$1
INCREMENT=$2

port=$BASE
isfree=$(lsof -i:$port)

while [[ -n "$isfree" ]]; do
  port=$[port+INCREMENT]
  isfree=$(lsof -i:$port)
done

echo "$port"
exit 0
