# Sample Python program to demonstrate List operations of Redis and   

# redis-py

import redis

 

# Create a redis client

redisClient = redis.StrictRedis(host='redis',port=6379,db=0)


# Print the contents of the Redis list

while(redisClient.llen('LanguageList')!=0):

    print(redisClient.lpop('LanguageList'))
