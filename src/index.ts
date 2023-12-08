// Apply this decorator to a function to track if all properties are set on the returned object
function EnforceAllReturnObjectPropsSet(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const result = originalMethod.apply(this, args);

    // Check if the returned object has the allPropertiesSet property
    if (
      result &&
      typeof result === "object" &&
      typeof result.allPropertiesSet !== "undefined"
    ) {
      if (result.allPropertiesSet === false) {
        throw new Error(
          `Not all properties are set in the returned object from ${propertyKey}, ` +
            `the following are not set: ${result.propertiesNotSet.join(", ")}`
        );
      }
    } else {
      console.warn(
        `The method ${propertyKey} did not return an object with an allPropertiesSet ` +
          `property. You probably forgot to apply the @TrackProps decorator to the class.`
      );
    }

    return result;
  };

  return descriptor;
}

// Apply this decorator to a class to track if all properties on an instance are set.
// If not, the allPropertiesSet property will be false and the propertiesNotSet property
// will contain the names of the properties that are not set.
function TrackProps<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);
      const setProperties = new Set<string>();
      return new Proxy(this, {
        get(target, prop, receiver) {
          if (prop === "allPropertiesSet") {
            return Object.keys(target).every((key) => setProperties.has(key));
          }
          if (prop === "propertiesNotSet") {
            return Object.keys(target).filter((key) => !setProperties.has(key));
          }
          return Reflect.get(target, prop, receiver);
        },
        set(target, prop, value, receiver) {
          setProperties.add(prop.toString());
          return Reflect.set(target, prop, value, receiver);
        },
      });
    }
  };
}

// @TrackProps ensures we track which properties are set (or not) on class instances
@TrackProps
class UserEntityProps {
  firstName: string;
  lastName: string;
  birthday: Date;
  username: string;
  // mentoringTopics: string[]; // Uncomment this line to trigger the error
}

@TrackProps
class UserPersistenceProps {
  FirstName: string;
  LastName: string;
  Birthday__c: Date;
  Username__c: string;
}

class UserMapper {
  @EnforceAllReturnObjectPropsSet // Check returned object, throw if not all props set
  static fromPersistence(persisted: UserPersistenceProps): UserEntityProps {
    const user = new UserEntityProps();
    user.firstName = persisted.FirstName;
    user.lastName = persisted.LastName;
    user.birthday = persisted.Birthday__c;
    user.username = persisted.Username__c;
    return user;
  }

  @EnforceAllReturnObjectPropsSet // Check returned object, throw if not all props set
  static toPersistence(user: UserEntityProps): UserPersistenceProps {
    const persisted = new UserPersistenceProps();
    persisted.FirstName = user.firstName;
    persisted.LastName = user.lastName;
    persisted.Birthday__c = user.birthday;
    persisted.Username__c = user.username;
    return persisted;
  }
}

const user = new UserEntityProps();
user.firstName = "John";
user.lastName = "Doe";
user.birthday = new Date(1990, 1, 1);
user.username = "johndoe123";

console.log((user as any).allPropertiesSet); // true: all properties are set

const persistedUser = UserMapper.toPersistence(user);
console.log("persistedUser");
console.log(persistedUser);

const mappedBack = UserMapper.fromPersistence(persistedUser);
console.log("mappedBack:");
console.log(mappedBack);
